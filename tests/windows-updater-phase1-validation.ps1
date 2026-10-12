$ErrorActionPreference='Stop'
$repository=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
. (Join-Path $repository 'scripts\windows\package-files.ps1')
. (Join-Path $repository 'scripts\windows\release-identity.ps1')
function Assert($condition,[string]$message){if(-not$condition){throw $message}}
function Write-Fixture([string]$path,[string]$text){New-Item -ItemType Directory -Force -Path ([IO.Path]::GetDirectoryName($path))|Out-Null;[IO.File]::WriteAllText($path,$text)}
function Expect-Failure([scriptblock]$action,[string]$message){$failed=$false;try{&$action}catch{$failed=$true};Assert $failed $message}

$fixture=Join-Path ([IO.Path]::GetTempPath()) ('grmetro updater phase1 '+[guid]::NewGuid())
$manifestPath='scripts/windows/package-manifest.json'
$baseFiles=@(
  'package.json','package-lock.json','.env.example','apps/backend/src/index.js','GRMetro Performance Center.exe',
  'scripts/windows/package-manifest.json','scripts/windows/package-build.json','scripts/windows/package-files.ps1',
  'scripts/windows/process-control.ps1','scripts/windows/launch-integration.ps1','scripts/windows/release-identity.ps1','scripts/windows/application-validation.ps1','scripts/windows/env-wizard.ps1'
)
$privatePaths=@('.env','.grmetro-autostart-choice','.grmetro-firewall-choice','data/company-config.json','data/goals.json','data/display-settings.json','data/management-dismissals.json','data/goals.json.tmp','logs/supervisor.log','apps/backend/data/spreadsheet-slide.json')

function New-TestPackage([string]$Name,[string]$Version,[string]$Content,[switch]$Obsolete) {
  $source=Join-Path $fixture ($Name+' source');$zip=Join-Path $fixture ($Name+'.zip')
  $files=@($baseFiles+@('README.md'))
  if($Obsolete){$files+=@('scripts/windows/obsolete-tool.ps1')}
  $files=@($files|Sort-Object -Unique)
  foreach($relative in $files){if($relative -notin @($manifestPath,'scripts/windows/package-build.json')){Write-Fixture (Join-Path $source $relative) "$Content $relative"}}
  $manifest=[ordered]@{version=1;files=$files};Write-Fixture (Join-Path $source $manifestPath) (($manifest|ConvertTo-Json -Depth 4)+[Environment]::NewLine)
  $metadata=New-GrMetroReleaseMetadata -ReleaseVersion $Version -Channel testing -Commit $Name -SourceState committed -BuiltAt '2026-10-06T12:00:00Z' -UpdaterProtocol 1 -NodeVersion 'v24.18.1'
  Write-Fixture (Join-Path $source 'scripts/windows/package-build.json') (($metadata|ConvertTo-Json -Depth 4)+[Environment]::NewLine)
  Add-Type -AssemblyName System.IO.Compression.FileSystem
  [IO.Compression.ZipFile]::CreateFromDirectory($source,$zip)
  return [pscustomobject]@{Root=$source;Zip=$zip;Files=$files;Version=$Version}
}

function Install-TestBaseline($Package,[string]$InstallRoot) {
  New-Item -ItemType Directory -Force -Path $InstallRoot|Out-Null
  foreach($relative in $Package.Files){$source=Join-Path $Package.Root $relative;$target=Join-Path $InstallRoot $relative;New-Item -ItemType Directory -Force -Path ([IO.Path]::GetDirectoryName($target))|Out-Null;Copy-Item -LiteralPath $source -Destination $target -Force}
  foreach($relative in $privatePaths){Write-Fixture (Join-Path $InstallRoot $relative) ('PRIVATE '+$relative)}
}

function Assert-PrivateState([string]$InstallRoot){foreach($relative in $privatePaths){Assert ((Get-Content -LiteralPath (Join-Path $InstallRoot $relative)-Raw)-eq('PRIVATE '+$relative)) "Persistent data changed: $relative"}}

try{
  $old=New-TestPackage 'old' '2026.10.6.1' 'OLD' -Obsolete
  $new=New-TestPackage 'new' '2026.10.6.2' 'NEW'
  $lower=New-TestPackage 'lower' '2026.10.6.1' 'LOWER'

  $id=ConvertTo-GrMetroReleaseVersion '2026.10.6.2'
  Assert ($id.ReleaseSequence -eq 202610060002) 'CalVer release sequence is not deterministic.'
  Assert ((Compare-GrMetroReleaseVersion '2026.10.6.2' '2026.10.6.1')-gt 0) 'CalVer comparison failed.'
  Expect-Failure {ConvertTo-GrMetroReleaseVersion '2026.2.30.1'} 'Invalid calendar date was accepted.'
  Expect-Failure {Assert-GrMetroUpgradeVersion '2026.10.6.2' '2026.10.6.2'} 'Same release was accepted.'
  Expect-Failure {Assert-GrMetroUpgradeVersion '2026.10.6.2' '2026.10.6.1'} 'Lower release was accepted.'
  $development=New-GrMetroReleaseMetadata
  Assert ($development.releaseVersion -eq '0.0.0.0' -and $development.channel -eq 'development') 'Developer build identity is not explicit.'
  Write-Output 'PASS: canonical development and CalVer release identities validate and compare numerically.'

  $normal=Join-Path $fixture 'normal/Performance Center';Install-TestBaseline $old $normal
  $prepared=Prepare-GrMetroPackageTransaction $new.Zip $normal
  Assert ($prepared.Status -eq 'prepared') 'Prepare did not publish a prepared transaction.'
  Assert ((Get-Content -LiteralPath (Join-Path $normal 'README.md')-Raw)-like 'OLD*') 'Prepare mutated the installed application.'
  $applied=Apply-GrMetroPreparedPackageTransaction $normal
  Assert ($applied.Status -eq 'applied') 'Apply did not publish an applied transaction.'
  Assert ((Get-Content -LiteralPath (Join-Path $normal 'README.md')-Raw)-like 'NEW*') 'Apply did not install new files.'
  Assert (-not(Test-Path -LiteralPath (Join-Path $normal 'scripts/windows/obsolete-tool.ps1'))) 'Apply did not remove obsolete inventory.'
  Complete-GrMetroUpgradeTransaction $normal
  Assert (-not(Test-Path -LiteralPath (Get-GrMetroUpgradeRoot $normal))) 'Commit did not clean the transaction root.'
  Assert-PrivateState $normal
  Write-Output 'PASS: explicit prepare, apply, and commit phases preserve private data and clean obsolete files.'

  foreach($failureCase in @(
    @{Name='replacement';Phase='replace';Path='README.md'},
    @{Name='obsolete';Phase='remove-obsolete';Path='scripts/windows/obsolete-tool.ps1'}
  )){
    $root=Join-Path $fixture ($failureCase.Name+'/Performance Center');Install-TestBaseline $old $root
    $null=Prepare-GrMetroPackageTransaction $new.Zip $root;$failed=$false
    try{$null=Apply-GrMetroPreparedPackageTransaction $root -FailureInjector {param($phase,$relative);if($phase -eq $failureCase.Phase -and $relative -eq $failureCase.Path){throw 'Injected mutation failure.'}}}catch{$failed=$_.Exception.Message-match'Injected mutation failure'}
    Assert $failed "Did not inject $($failureCase.Name) failure."
    Assert ((Get-Content -LiteralPath (Join-Path $root 'README.md')-Raw)-like'OLD*') "Rollback failed after $($failureCase.Name)."
    Assert (Test-Path -LiteralPath (Join-Path $root 'scripts/windows/obsolete-tool.ps1')) "Obsolete file was not restored after $($failureCase.Name)."
    Assert (-not(Test-Path -LiteralPath (Get-GrMetroUpgradeRoot $root))) "Rollback left transaction evidence after $($failureCase.Name)."
    Assert-PrivateState $root
  }
  Write-Output 'PASS: failures during replacement and obsolete cleanup restore the exact prior application.'

  $preparedRoot=Join-Path $fixture 'recovery prepared/Performance Center';Install-TestBaseline $old $preparedRoot;$null=Prepare-GrMetroPackageTransaction $new.Zip $preparedRoot
  Assert (-not(Restore-GrMetroUpgradeTransaction $preparedRoot)) 'Prepared recovery incorrectly rewrote the application.'
  Assert ((Get-Content -LiteralPath (Join-Path $preparedRoot 'README.md')-Raw)-like'OLD*') 'Prepared recovery changed installed files.'

  foreach($state in @('applying','applied')){
    $root=Join-Path $fixture ("recovery $state/Performance Center");Install-TestBaseline $old $root;$null=Prepare-GrMetroPackageTransaction $new.Zip $root
    Copy-Item -LiteralPath (Join-Path (Get-GrMetroUpgradeRoot $root) 'stage/README.md') -Destination (Join-Path $root 'README.md') -Force
    $journalPath=Join-Path (Get-GrMetroUpgradeRoot $root) 'journal.json';$journal=Get-Content -LiteralPath $journalPath -Raw|ConvertFrom-Json;$journal.status=$state;Write-GrMetroUpgradeJournal $journalPath $journal
    Assert (Restore-GrMetroUpgradeTransaction $root) "$state recovery did not report rollback."
    Assert ((Get-Content -LiteralPath (Join-Path $root 'README.md')-Raw)-like'OLD*') "$state recovery did not restore old content."
    Assert-PrivateState $root
  }

  $completedRoot=Join-Path $fixture 'recovery completed/Performance Center';Install-TestBaseline $old $completedRoot;$null=Prepare-GrMetroPackageTransaction $new.Zip $completedRoot;$null=Apply-GrMetroPreparedPackageTransaction $completedRoot
  $completedJournal=Join-Path (Get-GrMetroUpgradeRoot $completedRoot) 'journal.json';$journal=Get-Content -LiteralPath $completedJournal -Raw|ConvertFrom-Json;$journal.status='completed';Write-GrMetroUpgradeJournal $completedJournal $journal
  Assert (-not(Restore-GrMetroUpgradeTransaction $completedRoot)) 'Completed recovery incorrectly rolled back.'
  Assert ((Get-Content -LiteralPath (Join-Path $completedRoot 'README.md')-Raw)-like'NEW*') 'Completed recovery did not preserve committed content.'

  $corruptRoot=Join-Path $fixture 'recovery corrupt/Performance Center';Install-TestBaseline $old $corruptRoot;$corruptUpgrade=Get-GrMetroUpgradeRoot $corruptRoot;Write-Fixture (Join-Path $corruptUpgrade 'journal.json') '{bad json'
  Expect-Failure {Get-GrMetroUpgradeRecoveryAction $corruptRoot} 'Corrupt journal did not stop recovery.'
  Assert (Test-Path -LiteralPath $corruptUpgrade) 'Corrupt recovery evidence was deleted.'
  Write-Output 'PASS: prepared/applying/applied/completed power-loss states recover deterministically; corrupt evidence is preserved.'

  $hostOut=Join-Path $fixture 'external Update Host'
  & powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $repository 'scripts/windows/build-update-host.ps1') -OutputDirectory $hostOut|Out-Null
  if($LASTEXITCODE -ne 0){throw 'Could not build disposable external Update Host.'}
  Assert (-not([IO.Path]::GetFullPath($hostOut).StartsWith([IO.Path]::GetFullPath($normal).TrimEnd('\')+'\',[StringComparison]::OrdinalIgnoreCase))) 'Update Host was built inside the replaceable application.'
  $handoffRoot=Join-Path $fixture 'handoff/Performance Center';Install-TestBaseline $old $handoffRoot
  $parent=Start-Process powershell.exe -ArgumentList @('-NoProfile','-Command','Start-Sleep -Seconds 2') -PassThru -WindowStyle Hidden
  $hostProcess=Start-Process -FilePath (Join-Path $hostOut 'GRMetro Update Host.exe') -ArgumentList @('-Mode','ApplyLocal','-InstallRoot',('"{0}"'-f$handoffRoot),'-PackageZip',('"{0}"'-f$new.Zip),'-ExpectedReleaseVersion',$new.Version,'-ParentProcessId',[string]$parent.Id,'-Quiet','-SkipValidation','-NoLaunch') -PassThru
  Start-Sleep -Milliseconds 500
  Assert ((Get-Content -LiteralPath (Join-Path $handoffRoot 'README.md')-Raw)-like'OLD*') 'Update Host replaced the running application before handoff completed.'
  $hostProcess.WaitForExit(30000)|Out-Null
  Assert ($hostProcess.HasExited -and $hostProcess.ExitCode -eq 0) 'External Update Host local handoff failed.'
  Assert ((Get-Content -LiteralPath (Join-Path $handoffRoot 'README.md')-Raw)-like'NEW*') 'External Update Host did not apply after handoff.'
  Assert (-not(Test-Path -LiteralPath (Get-GrMetroUpgradeRoot $handoffRoot))) 'External Update Host left a completed transaction.'
  Assert-PrivateState $handoffRoot
  $validationFailureRoot=Join-Path $fixture 'host validation rollback/Performance Center';Install-TestBaseline $old $validationFailureRoot
  $failedHost=Start-Process -FilePath (Join-Path $hostOut 'GRMetro Update Host.exe') -ArgumentList @('-Mode','ApplyLocal','-InstallRoot',('"{0}"'-f$validationFailureRoot),'-PackageZip',('"{0}"'-f$new.Zip),'-ExpectedReleaseVersion',$new.Version,'-Quiet','-NoLaunch') -PassThru -Wait
  Assert ($failedHost.ExitCode -eq 1) 'Update Host did not report the injected application-validation failure.'
  Assert ((Get-Content -LiteralPath (Join-Path $validationFailureRoot 'README.md')-Raw)-like'OLD*') 'Validation failure did not restore the prior application.'
  Assert (-not(Test-Path -LiteralPath (Get-GrMetroUpgradeRoot $validationFailureRoot))) 'Validation rollback left a transaction root.'
  Assert-PrivateState $validationFailureRoot
  $lowerHost=Start-Process -FilePath (Join-Path $hostOut 'GRMetro Update Host.exe') -ArgumentList @('-Mode','ApplyLocal','-InstallRoot',('"{0}"'-f$handoffRoot),'-PackageZip',('"{0}"'-f$lower.Zip),'-ExpectedReleaseVersion',$lower.Version,'-Quiet','-SkipValidation','-NoLaunch') -PassThru -Wait
  Assert ($lowerHost.ExitCode -eq 1) 'Update Host accepted a same/lower release.'
  Assert ((Get-Content -LiteralPath (Join-Path $handoffRoot 'README.md')-Raw)-like'NEW*') 'Rejected downgrade changed the installed application.'
  Assert (-not(Test-Path -LiteralPath (Get-GrMetroUpgradeRoot $handoffRoot))) 'Rejected downgrade created a transaction.'
  Write-Output 'PASS: external native Update Host waits for handoff, rolls back validation failure, rejects downgrade, and preserves persistent data.'

  $source=Get-Content -LiteralPath (Join-Path $repository 'scripts/windows/application-validation.ps1')-Raw
  Assert ($source -notmatch 'env-wizard|configure-private-firewall|install-performance-center-autostart|CreateShortcut') 'Routine validation contains installation integration work.'
  Assert ($source -match 'ServiceTitanRequired=\$false') 'Routine validation does not explicitly exclude ServiceTitan authentication.'
  $hostSource=Get-Content -LiteralPath (Join-Path $repository 'scripts/windows/update-host.ps1')-Raw
  Assert ($hostSource -notmatch '\bgit\b|\bnpm(?:\.cmd)?\b') 'Update Host depends on Git or npm.'
  Assert ($hostSource -notmatch 'Edge Profile|Remote App Profile|msedge') 'Update Host touches Edge or browser profiles.'
  Write-Output 'PASS: routine validation is side-effect-free and the host has no Git/npm/browser-profile dependency.'
}finally{
  $cleanup=[IO.Path]::GetFullPath($fixture);$temp=[IO.Path]::GetFullPath([IO.Path]::GetTempPath()).TrimEnd('\')
  if([IO.Path]::GetDirectoryName($cleanup)-ne$temp -or [IO.Path]::GetFileName($cleanup)-notlike'grmetro updater phase1 *'){throw 'Unsafe updater fixture cleanup path.'}
  if(Test-Path -LiteralPath $cleanup){
    for($attempt=1;$attempt-le8;$attempt++){try{Remove-Item -LiteralPath $cleanup -Recurse -Force -ErrorAction Stop;break}catch{if($attempt-eq8){Write-Warning "Disposable updater fixture cleanup was deferred: $($_.Exception.Message)"}else{Start-Sleep -Milliseconds 250}}}
  }
}
