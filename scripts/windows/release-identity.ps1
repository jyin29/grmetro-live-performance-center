# Canonical GRMetro deployment identity. Workspace package versions remain independent.
function ConvertTo-GrMetroReleaseVersion([string]$Version,[switch]$AllowDevelopment) {
  if($AllowDevelopment -and $Version -eq '0.0.0.0'){
    return [pscustomobject]@{ReleaseVersion=$Version;ReleaseSequence=[Int64]0;Year=0;Month=0;Day=0;Revision=0;Development=$true}
  }
  if($Version -notmatch '^(\d{4})\.(\d{1,2})\.(\d{1,2})\.(\d{1,4})$'){throw 'Release version must use YYYY.M.D.N with four numeric components.'}
  $year=[int]$matches[1];$month=[int]$matches[2];$day=[int]$matches[3];$revision=[int]$matches[4]
  if($revision -lt 1){throw 'Release revision must be at least 1.'}
  try{$null=[DateTime]::new($year,$month,$day)}catch{throw 'Release version contains an invalid calendar date.'}
  $normalized="$year.$month.$day.$revision"
  $sequence=([Int64]$year*100000000)+([Int64]$month*1000000)+([Int64]$day*10000)+$revision
  return [pscustomobject]@{ReleaseVersion=$normalized;ReleaseSequence=$sequence;Year=$year;Month=$month;Day=$day;Revision=$revision;Development=$false}
}

function Compare-GrMetroReleaseVersion([string]$Left,[string]$Right) {
  $leftIdentity=ConvertTo-GrMetroReleaseVersion $Left -AllowDevelopment
  $rightIdentity=ConvertTo-GrMetroReleaseVersion $Right -AllowDevelopment
  return [Math]::Sign($leftIdentity.ReleaseSequence-$rightIdentity.ReleaseSequence)
}

function New-GrMetroReleaseMetadata([string]$ReleaseVersion='0.0.0.0',[string]$Channel='development',[string]$Commit='packaged',[string]$SourceState='packaged',[string]$BuiltAt=([DateTime]::UtcNow.ToString('o')),[int]$UpdaterProtocol=1,[string]$NodeVersion=$null) {
  $development=$Channel -eq 'development'
  if($Channel -notin @('development','testing','stable')){throw 'Release channel must be development, testing, or stable.'}
  $identity=ConvertTo-GrMetroReleaseVersion $ReleaseVersion -AllowDevelopment:$development
  if(-not$development -and $identity.Development){throw 'Testing and stable packages require an explicit production release version.'}
  if($development -and -not$identity.Development){throw 'Ordinary development packages must use the explicit 0.0.0.0 development identity.'}
  if($UpdaterProtocol -lt 1){throw 'Updater protocol must be at least 1.'}
  return [ordered]@{
    schemaVersion=2
    releaseVersion=$identity.ReleaseVersion
    releaseSequence=$identity.ReleaseSequence
    channel=$Channel
    commit=$Commit
    sourceState=$SourceState
    builtAt=$BuiltAt
    updaterProtocol=$UpdaterProtocol
    nodeVersion=$NodeVersion
  }
}

function Get-GrMetroInstalledReleaseMetadata([string]$InstallRoot) {
  $path=Join-Path ([IO.Path]::GetFullPath($InstallRoot).TrimEnd('\')) 'scripts\windows\package-build.json'
  if(-not(Test-Path -LiteralPath $path -PathType Leaf)){throw 'Installed release metadata is missing.'}
  $metadata=Get-Content -LiteralPath $path -Raw|ConvertFrom-Json
  if([int]$metadata.schemaVersion -ne 2){throw 'Installed release metadata schema is unsupported.'}
  $identity=ConvertTo-GrMetroReleaseVersion ([string]$metadata.releaseVersion) -AllowDevelopment:([string]$metadata.channel -eq 'development')
  if([Int64]$metadata.releaseSequence -ne $identity.ReleaseSequence){throw 'Installed release metadata sequence does not match its version.'}
  if([int]$metadata.updaterProtocol -lt 1){throw 'Installed updater protocol is invalid.'}
  return $metadata
}

function Get-GrMetroPackageReleaseMetadata([string]$PackageZip) {
  Add-Type -AssemblyName System.IO.Compression.FileSystem
  $archive=$null
  try{
    $archive=[IO.Compression.ZipFile]::OpenRead([IO.Path]::GetFullPath($PackageZip))
    $entry=$archive.GetEntry('scripts/windows/package-build.json')
    if(-not$entry){$entry=$archive.GetEntry('scripts\windows\package-build.json')}
    if(-not$entry){throw 'Package release metadata is missing.'}
    $reader=New-Object IO.StreamReader($entry.Open())
    try{$metadata=$reader.ReadToEnd()|ConvertFrom-Json}finally{$reader.Dispose()}
    if([int]$metadata.schemaVersion -ne 2){throw 'Package release metadata schema is unsupported.'}
    $identity=ConvertTo-GrMetroReleaseVersion ([string]$metadata.releaseVersion) -AllowDevelopment:([string]$metadata.channel -eq 'development')
    if([Int64]$metadata.releaseSequence -ne $identity.ReleaseSequence){throw 'Package release metadata sequence does not match its version.'}
    if([int]$metadata.updaterProtocol -lt 1){throw 'Package updater protocol is invalid.'}
    return $metadata
  }finally{if($archive){$archive.Dispose()}}
}

function Assert-GrMetroUpgradeVersion([string]$CurrentVersion,[string]$TargetVersion,[switch]$AllowDevelopmentTarget) {
  $target=ConvertTo-GrMetroReleaseVersion $TargetVersion -AllowDevelopment:$AllowDevelopmentTarget
  if($target.Development -and -not$AllowDevelopmentTarget){throw 'Routine updates cannot install a development release.'}
  if((Compare-GrMetroReleaseVersion $TargetVersion $CurrentVersion)-le 0){throw "Target release $TargetVersion is not newer than installed release $CurrentVersion."}
  return $target
}
