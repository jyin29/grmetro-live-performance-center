param(
  [string]$PackageZip,[string]$ExpectedPackageSha256,[string]$ExpectedReleaseVersion,[string]$ExpectedInstalledCommit,
  [string]$UpdateHostBundle,[string]$ExpectedUpdateHostSha256,
  [string]$InstallRoot=(Join-Path $env:LOCALAPPDATA 'GRMetro\Performance Center'),
  [switch]$ValidateOnly,[switch]$ConfirmDefenderReview,[switch]$ConfirmRollbackSource,[switch]$ConfirmUnsignedInternalHost,[int]$ValidationPort=3000
)
$ErrorActionPreference='Stop'
. (Join-Path $PSScriptRoot 'package-files.ps1')
. (Join-Path $PSScriptRoot 'process-control.ps1')
. (Join-Path $PSScriptRoot 'release-identity.ps1')
. (Join-Path $PSScriptRoot 'release-feed.ps1')
. (Join-Path $PSScriptRoot 'launch-integration.ps1')
. (Join-Path $PSScriptRoot 'update-host-installation.ps1')
. (Join-Path $PSScriptRoot 'install-update-host.ps1')
. (Join-Path $PSScriptRoot 'manual-legacy-upgrade.ps1')

function Test-GrMetroTargetUpdateHostBundle {
  param([string]$ApplicationPackage,[string]$TargetVersion,[string]$HostBundle,[string]$HostHash,[switch]$ConfirmUnsigned,[scriptblock]$ValidationAction=$null)
  if($ValidationAction){return &$ValidationAction $ApplicationPackage $TargetVersion $HostBundle $HostHash}
  Add-Type -AssemblyName System.IO.Compression.FileSystem
  $fixture=Join-Path ([IO.Path]::GetTempPath()) ('grmetro-target-host-preflight-'+[guid]::NewGuid().ToString('N'));$savedTest=$env:GRMETRO_UPDATER_TEST_MODE
  try{
    $identityPath=Join-Path $fixture 'scripts\windows\package-build.json';New-Item -ItemType Directory -Force -Path ([IO.Path]::GetDirectoryName($identityPath))|Out-Null
    $archive=[IO.Compression.ZipFile]::OpenRead([IO.Path]::GetFullPath($ApplicationPackage));try{$entry=$archive.Entries|Where-Object{$_.FullName.Replace('\','/')-eq'scripts/windows/package-build.json'}|Select-Object -First 1;if(-not$entry){throw 'Target package identity is missing.'};[IO.Compression.ZipFileExtensions]::ExtractToFile($entry,$identityPath,$false)}finally{$archive.Dispose()}
    $env:GRMETRO_UPDATER_TEST_MODE='true'
    return Test-GrMetroUpdateHostMigration -Root $fixture -Bundle $HostBundle -ExpectedHash $HostHash -InstalledVersion $TargetVersion -Channel testing -ConfirmUnsigned:$ConfirmUnsigned -AllowTestRoot
  }finally{
    $env:GRMETRO_UPDATER_TEST_MODE=$savedTest
    $resolved=[IO.Path]::GetFullPath($fixture);$temp=[IO.Path]::GetFullPath([IO.Path]::GetTempPath()).TrimEnd('\');if([IO.Path]::GetDirectoryName($resolved)-ne$temp-or[IO.Path]::GetFileName($resolved)-notlike'grmetro-target-host-preflight-*'){throw 'Unsafe target-host preflight cleanup path.'};if(Test-Path -LiteralPath $resolved){Remove-Item -LiteralPath $resolved -Recurse -Force}
  }
}

function Test-GrMetroLegacyCompositeUpgrade {
  param([string]$Root,[string]$Zip,[string]$ExpectedHash,[string]$Version,[string]$LegacyCommit,[string]$HostBundle,[string]$HostHash,[switch]$ConfirmUnsigned,[switch]$AllowTestRoot,[scriptblock]$PrivateConfigurationAction=$null,[scriptblock]$HostValidationAction=$null)
  $manualArgs=@{Root=$Root;Zip=$Zip;ExpectedHash=$ExpectedHash;ExpectedVersion=$Version;ExpectedCommit=$LegacyCommit;AllowTestRoot=$AllowTestRoot}
  if($PrivateConfigurationAction){$manualArgs.PrivateConfigurationAction=$PrivateConfigurationAction}
  $application=Test-GrMetroManualLegacyUpgrade @manualArgs
  $hostPath=[IO.Path]::GetFullPath($HostBundle);if(-not(Test-Path -LiteralPath $hostPath -PathType Leaf)){throw 'The reviewed Update Host migration bundle is missing.'}
  $approvedHostHash=([string]$HostHash).ToUpperInvariant();if($approvedHostHash-notmatch'^[A-F0-9]{64}$'-or(Get-FileHash $hostPath -Algorithm SHA256).Hash-ne$approvedHostHash){throw 'Update Host migration bundle SHA-256 does not match the approved value.'}
  $hostValidation=Test-GrMetroTargetUpdateHostBundle -ApplicationPackage $application.PackageZip -TargetVersion $Version -HostBundle $hostPath -HostHash $approvedHostHash -ConfirmUnsigned:$ConfirmUnsigned -ValidationAction $HostValidationAction
  if([string]$hostValidation.Status-ne'validated'){throw 'Update Host migration preflight did not report validation.'}
  return [pscustomobject]@{Application=$application;HostBundle=$hostPath;HostSha256=$approvedHostHash;HostValidation=$hostValidation}
}

function Invoke-GrMetroLegacyCompositeUpgrade {
  param(
    [string]$Root,[string]$Zip,[string]$ExpectedHash,[string]$Version,[string]$LegacyCommit,[string]$HostBundle,[string]$HostHash,
    [switch]$ValidateOnly,[switch]$ConfirmDefender,[switch]$ConfirmRollback,[switch]$ConfirmUnsigned,[switch]$AllowTestRoot,[int]$Port=3000,
    [scriptblock]$PrivateConfigurationAction=$null,[scriptblock]$HostValidationAction=$null,
    [scriptblock]$InstallHostAction={param($bundle)Install-GrMetroStableUpdateHost $bundle},
    [scriptblock]$ManualUpgradeAction=$null,[scriptblock]$SaveLaunchAction={param($install)Save-GrMetroLaunchIntegrationState $install},
    [scriptblock]$SetLaunchAction={param($install,$enabled)Set-GrMetroLaunchIntegration $install $enabled},
    [scriptblock]$RestoreLaunchAction={param($state)Restore-GrMetroLaunchIntegration $state},
    [scriptblock]$CompleteApplicationAction={param($install)Complete-GrMetroUpgradeTransaction $install},
    [scriptblock]$CompleteHostAction={param($state)Complete-GrMetroStableUpdateHost $state},
    [scriptblock]$RestoreHostAction={param($state)Restore-GrMetroStableUpdateHost $state},
    [scriptblock]$RestoreApplicationAction={param($install)Restore-GrMetroUpgradeTransaction $install},
    [scriptblock]$StartApplicationAction={param($install)Start-GrMetroInstalledApplication $install},
    [scriptblock]$RestartPriorAction={param($install,$state)Restart-GrMetroAfterFailedUpgrade $install $state}
  )
  $preflightArgs=@{Root=$Root;Zip=$Zip;ExpectedHash=$ExpectedHash;Version=$Version;LegacyCommit=$LegacyCommit;HostBundle=$HostBundle;HostHash=$HostHash;ConfirmUnsigned=$ConfirmUnsigned;AllowTestRoot=$AllowTestRoot}
  if($PrivateConfigurationAction){$preflightArgs.PrivateConfigurationAction=$PrivateConfigurationAction};if($HostValidationAction){$preflightArgs.HostValidationAction=$HostValidationAction}
  $preflight=Test-GrMetroLegacyCompositeUpgrade @preflightArgs
  if($ValidateOnly){return [pscustomobject]@{Status='validated';TargetVersion=$Version;InstalledCommit=$preflight.Application.InstalledCommit;ApplicationFiles=$preflight.Application.InstalledManifestFiles;HostStatus=$preflight.HostValidation.Status;RecoveryAction=$preflight.Application.RecoveryAction}}
  if(-not$ConfirmDefender){throw 'Composite legacy upgrade requires explicit confirmation that Defender review completed without a detection.'};if(-not$ConfirmRollback){throw 'Composite legacy upgrade requires an independently verified rollback source.'}
  $hostState=$null;$launchState=$null;$applicationPending=$false;$applicationCommitted=$false;$manualResult=$null
  try{
    $hostState=&$InstallHostAction $preflight.HostBundle
    if(-not$hostState.ApplyOnSetup-or$hostState.SourceChannel-ne'testing'){throw 'Installed Update Host trust policy does not match the approved testing source.'}
    if($ManualUpgradeAction){$manualResult=&$ManualUpgradeAction $preflight.Application $Port}
    else{
      $manualArgs=@{Root=$preflight.Application.InstallRoot;Zip=$preflight.Application.PackageZip;ExpectedHash=$preflight.Application.PackageSha256;ExpectedVersion=$Version;ExpectedCommit=$LegacyCommit;ConfirmDefenderReview=$true;ConfirmRollbackSource=$true;DeferCommitCleanup=$true;AllowTestRoot=$AllowTestRoot;Port=$Port}
      if($PrivateConfigurationAction){$manualArgs.PrivateConfigurationAction=$PrivateConfigurationAction}
      $manualResult=Invoke-GrMetroManualLegacyUpgrade @manualArgs
    }
    if([string]$manualResult.Status-ne'validated-pending-commit'){throw 'Application upgrade did not remain available for composite rollback.'};$applicationPending=$true
    $choicePath=Join-Path $preflight.Application.InstallRoot '.grmetro-autostart-choice';$choice=if(Test-Path -LiteralPath $choicePath){(Get-Content -LiteralPath $choicePath -Raw).Trim().ToLowerInvariant()}else{'no'};if($choice-notin@('yes','no')){throw 'Installed autostart choice is invalid.'}
    $launchState=&$SaveLaunchAction $preflight.Application.InstallRoot;$launchPaths=&$SetLaunchAction $preflight.Application.InstallRoot ($choice-eq'yes')
    &$CompleteApplicationAction $preflight.Application.InstallRoot;$applicationPending=$false;$applicationCommitted=$true
    $hostCleanupWarning=$null;try{&$CompleteHostAction $hostState;$hostState=$null}catch{$hostCleanupWarning=$_.Exception.Message}
    $launchState=$null
    &$StartApplicationAction $preflight.Application.InstallRoot
    return [pscustomobject]@{Status=$(if($hostCleanupWarning){'complete-cleanup-required'}else{'complete'});ReleaseVersion=$Version;UpdateHost=$launchPaths.HostExecutable;AutostartEnabled=($choice-eq'yes');ApplicationEvidence=$manualResult.EvidencePath;HostCleanupWarning=$hostCleanupWarning;ApplicationStarted=$true}
  }catch{
    $failure=$_;$rollbackFailure=$null
    if(-not$applicationCommitted){
      if($launchState){try{&$RestoreLaunchAction $launchState}catch{$rollbackFailure=$_}}
      if($applicationPending-and(Test-Path -LiteralPath (Get-GrMetroUpgradeRoot $preflight.Application.InstallRoot))){try{$null=&$RestoreApplicationAction $preflight.Application.InstallRoot}catch{if(-not$rollbackFailure){$rollbackFailure=$_}}}
      if($hostState){try{&$RestoreHostAction $hostState}catch{if(-not$rollbackFailure){$rollbackFailure=$_}}}
      if($manualResult-and$manualResult.PriorProcessState-and-not$rollbackFailure){try{&$RestartPriorAction $preflight.Application.InstallRoot $manualResult.PriorProcessState}catch{$rollbackFailure=$_}}
    }
    if($rollbackFailure){throw "Composite legacy upgrade failed: $($failure.Exception.Message). Rollback also failed: $($rollbackFailure.Exception.Message)"}
    if($applicationCommitted){throw "Composite legacy upgrade installed the application, but final restart/cleanup failed: $($failure.Exception.Message)"}
    throw "$($failure.Exception.Message) The prior application and Update Host state were restored."
  }
}

if($MyInvocation.InvocationName-ne'.'){
  foreach($value in @($PackageZip,$ExpectedPackageSha256,$ExpectedReleaseVersion,$ExpectedInstalledCommit,$UpdateHostBundle,$ExpectedUpdateHostSha256)){if(-not$value){throw 'Application package, host bundle, approved hashes, version, and legacy commit are required.'}}
  Invoke-GrMetroLegacyCompositeUpgrade -Root $InstallRoot -Zip $PackageZip -ExpectedHash $ExpectedPackageSha256 -Version $ExpectedReleaseVersion -LegacyCommit $ExpectedInstalledCommit -HostBundle $UpdateHostBundle -HostHash $ExpectedUpdateHostSha256 -ValidateOnly:$ValidateOnly -ConfirmDefender:$ConfirmDefenderReview -ConfirmRollback:$ConfirmRollbackSource -ConfirmUnsigned:$ConfirmUnsignedInternalHost -Port $ValidationPort
}
