param(
  [switch]$CheckOnly,[switch]$InstallRemote,[string]$PackageZip,[string]$ExpectedReleaseVersion,
  [int]$ParentProcessId=0,[string]$StatusPath,[string]$UpdateHostPath,
  [switch]$AllowDevelopmentPackage,[switch]$NoLaunch
)
$ErrorActionPreference='Stop'
$root=(Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$defaultHost=Join-Path $env:LOCALAPPDATA 'GRMetro\Update Host\GRMetro Update Host.exe'
if(-not$UpdateHostPath){$UpdateHostPath=$defaultHost}
if([IO.Path]::GetFullPath($UpdateHostPath)-ne[IO.Path]::GetFullPath($defaultHost)-and$env:GRMETRO_UPDATER_TEST_MODE-ne'true'){throw 'Update Host path override is disabled outside disposable tests.'}
if(-not(Test-Path -LiteralPath $UpdateHostPath -PathType Leaf)){throw 'The stable GRMetro Update Host is not installed. Use the latest Setup EXE.'}

function Invoke-GrMetroUpdateHostCheck {
  $hostRoot=[IO.Path]::GetDirectoryName([IO.Path]::GetFullPath($UpdateHostPath));$hostScript=Join-Path $hostRoot 'update-host.ps1'
  if(-not(Test-Path -LiteralPath $hostScript -PathType Leaf)){throw 'The stable GRMetro Update Host files are incomplete.'}
  $operationId=[guid]::NewGuid().ToString('N');$stdout=Join-Path ([IO.Path]::GetTempPath()) "grmetro-update-check-worker-$operationId.out";$stderr=$stdout+'.err'
  try{
    $arguments=@('-NoProfile','-ExecutionPolicy','Bypass','-WindowStyle','Hidden','-File',('"{0}"'-f$hostScript),'-Mode','Check','-InstallRoot',('"{0}"'-f$root),'-Quiet')
    $process=Start-Process -FilePath powershell.exe -ArgumentList $arguments -WorkingDirectory $hostRoot -WindowStyle Hidden -RedirectStandardOutput $stdout -RedirectStandardError $stderr -PassThru -Wait
    $output=if((Test-Path -LiteralPath $stdout)-and(Get-Item -LiteralPath $stdout).Length-gt0){Get-Content -LiteralPath $stdout -Raw}else{''}
    $errorText=if((Test-Path -LiteralPath $stderr)-and(Get-Item -LiteralPath $stderr).Length-gt0){Get-Content -LiteralPath $stderr -Raw}else{''}
    if($process.ExitCode-ne0){$detail=@($errorText-split"`r?`n"|ForEach-Object{$_.Trim()}|Where-Object{$_-and$_-notmatch'^At .+\.ps1:'})[0];if(-not$detail){$detail='The configured release source could not be reached or verified.'};foreach($path in @($root,$hostRoot)){if($path){$detail=$detail.Replace($path,'the GRMetro installation')}};throw "GRMetro Update Host could not check the configured release source. $($detail.Substring(0,[Math]::Min(300,$detail.Length)))"}
    $json=@($output-split"`r?`n"|Where-Object{$_.Trim().StartsWith('{')})|Select-Object -Last 1
    if(-not$json){throw 'GRMetro Update Host returned no update-check result.'}
    return $json
  }finally{Remove-Item -LiteralPath $stdout,$stderr -Force -ErrorAction SilentlyContinue}
}

function Get-GrMetroReleaseHistory($CheckResult) {
  $identityScript=Join-Path $PSScriptRoot 'release-identity.ps1'
  if(-not(Test-Path -LiteralPath $identityScript -PathType Leaf)){return @()}
  . $identityScript
  $entries=[ordered]@{}
  $stateRoot=Join-Path $env:LOCALAPPDATA 'GRMetro\Update State';$trustPath=Join-Path $stateRoot 'trust-state.json'
  try{
    if(Test-Path -LiteralPath $trustPath -PathType Leaf){
      $trust=Get-Content -LiteralPath $trustPath -Raw|ConvertFrom-Json
      foreach($property in @($trust.identities.PSObject.Properties)){
        try{$identity=ConvertTo-GrMetroReleaseVersion ([string]$property.Name)}catch{continue}
        $entries[$identity.ReleaseVersion]=[ordered]@{version=$identity.ReleaseVersion;sequence=$identity.ReleaseSequence;status='verified';artifactSha256=[string]$property.Value;date=$null;dateSource=$null;releaseNotes=@();notesAvailable=$false;restoreAvailable=$false}
      }
    }
  }catch{/* a corrupt history view must not weaken or block the signed update check */}
  $installed=Get-GrMetroInstalledReleaseMetadata $root;$installedIdentity=ConvertTo-GrMetroReleaseVersion ([string]$installed.releaseVersion) -AllowDevelopment:([string]$installed.channel-eq'development')
  $installedEntry=if($entries.Contains($installedIdentity.ReleaseVersion)){$entries[$installedIdentity.ReleaseVersion]}else{[ordered]@{version=$installedIdentity.ReleaseVersion;sequence=$installedIdentity.ReleaseSequence;artifactSha256=$null;releaseNotes=@();notesAvailable=$false;restoreAvailable=$false}}
  $installedEntry.status='installed';$installedEntry.date=if($installed.builtAt){[string]$installed.builtAt}else{$null};$installedEntry.dateSource=if($installed.builtAt){'build'}else{$null};$installedEntry.commit=if($installed.commit){[string]$installed.commit}else{$null};$entries[$installedIdentity.ReleaseVersion]=$installedEntry
  if($CheckResult -and $CheckResult.metadata -and $CheckResult.metadata.releaseVersion){
    $metadata=$CheckResult.metadata;$latestIdentity=ConvertTo-GrMetroReleaseVersion ([string]$metadata.releaseVersion)
    $latest=if($entries.Contains($latestIdentity.ReleaseVersion)){$entries[$latestIdentity.ReleaseVersion]}else{[ordered]@{version=$latestIdentity.ReleaseVersion;sequence=$latestIdentity.ReleaseSequence;artifactSha256=[string]$metadata.artifactSha256;restoreAvailable=$false}}
    if($latest.status-ne'installed'){$latest.status=if($CheckResult.updateAvailable){'available'}else{'verified'}}
    $latest.date=if($metadata.publishedAt){[string]$metadata.publishedAt}else{$latest.date};$latest.dateSource=if($metadata.publishedAt){'published'}else{$latest.dateSource};$latest.releaseNotes=@($metadata.releaseNotes|ForEach-Object{[string]$_});$latest.notesAvailable=[bool]$latest.releaseNotes.Count;$entries[$latestIdentity.ReleaseVersion]=$latest
  }
  return @($entries.Values|Sort-Object {[Int64]$_.sequence} -Descending|Select-Object -First 50|ForEach-Object{[pscustomobject]$_})
}

function Add-GrMetroReleaseHistory($CheckResult) {
  try{$history=@(Get-GrMetroReleaseHistory $CheckResult)}catch{$history=@()}
  $CheckResult|Add-Member -NotePropertyName versionHistory -NotePropertyValue $history -Force
  $CheckResult|Add-Member -NotePropertyName restoreVersionSupported -NotePropertyValue $false -Force
  return $CheckResult
}

if($CheckOnly){
  $check=Invoke-GrMetroUpdateHostCheck|ConvertFrom-Json;Add-GrMetroReleaseHistory $check|ConvertTo-Json -Compress -Depth 10;exit 0
}

if($InstallRemote){
  if($ParentProcessId-lt1){throw 'Remote update handoff requires the initiating Control Center process ID.'}
  if(-not$StatusPath){$stateRoot=Join-Path $env:LOCALAPPDATA 'GRMetro\Update State';New-Item -ItemType Directory -Force -Path $stateRoot|Out-Null;$StatusPath=Join-Path $stateRoot ('operation-'+[guid]::NewGuid().ToString('N')+'.json')}
  $arguments=@('-Mode','PrepareRemote','-InstallRoot',('"{0}"'-f$root),'-ParentProcessId',[string]$ParentProcessId,'-StatusPath',('"{0}"'-f[IO.Path]::GetFullPath($StatusPath)),'-Quiet')
  if($ExpectedReleaseVersion){$arguments+=@('-ExpectedReleaseVersion',$ExpectedReleaseVersion)}
  if($NoLaunch){$arguments+='-NoLaunch'}
  Start-Process -FilePath $UpdateHostPath -ArgumentList $arguments -WorkingDirectory ([IO.Path]::GetDirectoryName($UpdateHostPath))|Out-Null
  [ordered]@{handoffStarted=$true;remote=$true;statusPath=[IO.Path]::GetFullPath($StatusPath);expectedRelease=$ExpectedReleaseVersion}|ConvertTo-Json -Compress;exit 0
}

if($PackageZip){
  $arguments=@('-Mode','ApplyLocal','-InstallRoot',('"{0}"'-f$root),'-PackageZip',('"{0}"'-f[IO.Path]::GetFullPath($PackageZip)))
  if($ExpectedReleaseVersion){$arguments+=@('-ExpectedReleaseVersion',$ExpectedReleaseVersion)}
  if($ParentProcessId-gt0){$arguments+=@('-ParentProcessId',[string]$ParentProcessId)}
  if($AllowDevelopmentPackage){$arguments+='-AllowDevelopmentPackage'}
  if($NoLaunch){$arguments+='-NoLaunch'}
  Start-Process -FilePath $UpdateHostPath -ArgumentList $arguments -WorkingDirectory ([IO.Path]::GetDirectoryName($UpdateHostPath))|Out-Null
  [ordered]@{handoffStarted=$true;remote=$false;package=[IO.Path]::GetFullPath($PackageZip)}|ConvertTo-Json -Compress;exit 0
}

$check=Invoke-GrMetroUpdateHostCheck|ConvertFrom-Json;Add-GrMetroReleaseHistory $check|ConvertTo-Json -Compress -Depth 10
exit 0
