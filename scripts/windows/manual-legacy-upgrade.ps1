param(
  [string]$PackageZip,
  [ValidatePattern('^[A-Fa-f0-9]{64}$')][string]$ExpectedPackageSha256,
  [string]$ExpectedReleaseVersion,
  [ValidatePattern('^[A-Fa-f0-9]{7,40}$')][string]$ExpectedInstalledCommit,
  [string]$InstallRoot = (Join-Path $env:LOCALAPPDATA 'GRMetro\Performance Center'),
  [switch]$ValidateOnly,
  [switch]$ConfirmDefenderReview,
  [switch]$ConfirmRollbackSource
)
$ErrorActionPreference='Stop'
. (Join-Path $PSScriptRoot 'package-files.ps1')
. (Join-Path $PSScriptRoot 'process-control.ps1')
. (Join-Path $PSScriptRoot 'application-validation.ps1')
. (Join-Path $PSScriptRoot 'release-identity.ps1')

function Assert-GrMetroManualLegacyInstallRoot([string]$Root,[switch]$AllowTestRoot) {
  $resolved=[IO.Path]::GetFullPath($Root).TrimEnd('\')
  if(-not$AllowTestRoot){
    $expected=[IO.Path]::GetFullPath((Join-Path $env:LOCALAPPDATA 'GRMetro\Performance Center')).TrimEnd('\')
    if($resolved-ne$expected){throw 'Manual legacy deployment is restricted to the expected GRMetro per-user installation root.'}
  }elseif($env:GRMETRO_UPDATER_TEST_MODE-ne'true'){
    throw 'Manual legacy deployment test roots are disabled outside disposable tests.'
  }
  $current=$resolved
  while($current){
    if(Test-Path -LiteralPath $current){
      if((Get-Item -LiteralPath $current -Force).Attributes-band[IO.FileAttributes]::ReparsePoint){throw 'Manual legacy deployment path contains a reparse point.'}
    }
    $current=[IO.Path]::GetDirectoryName($current)
  }
  if(-not(Test-Path -LiteralPath $resolved -PathType Container)){throw 'The installed GRMetro application directory is missing.'}
  return $resolved
}

function Get-GrMetroLegacyInstalledIdentity([string]$Root,[string]$ExpectedCommit) {
  $path=Join-Path $Root 'scripts\windows\package-build.json'
  if(-not(Test-Path -LiteralPath $path -PathType Leaf)){throw 'Legacy installed package identity is missing.'}
  try{$identity=Get-Content -LiteralPath $path -Raw|ConvertFrom-Json}catch{throw 'Legacy installed package identity is malformed.'}
  if($null-ne$identity.schemaVersion-or$identity.releaseVersion-or$null-ne$identity.releaseSequence-or$identity.channel-or$null-ne$identity.updaterProtocol){
    throw 'The installed application already has modern release identity. Use the normal Update Host instead of the legacy manual wrapper.'
  }
  $commit=[string]$identity.commit
  if($commit-notmatch'^[A-Fa-f0-9]{7,40}$'-or$commit.ToLowerInvariant()-ne$ExpectedCommit.ToLowerInvariant()){
    throw "Installed legacy commit $commit does not match the explicitly approved commit $ExpectedCommit."
  }
  return $identity
}

function Get-GrMetroManualEvidencePath([string]$Root,[switch]$AllowTestRoot) {
  $parent=if($AllowTestRoot){[IO.Path]::GetDirectoryName($Root)}else{Join-Path $env:LOCALAPPDATA 'GRMetro'}
  $parent=[IO.Path]::GetFullPath($parent).TrimEnd('\')
  $evidenceRoot=[IO.Path]::GetFullPath((Join-Path $parent 'Manual Upgrade Evidence'))
  if([IO.Path]::GetDirectoryName($evidenceRoot)-ne$parent){throw 'Manual upgrade evidence path escaped its expected root.'}
  if((Test-Path -LiteralPath $evidenceRoot)-and((Get-Item -LiteralPath $evidenceRoot -Force).Attributes-band[IO.FileAttributes]::ReparsePoint)){throw 'Manual upgrade evidence path is a reparse point.'}
  New-Item -ItemType Directory -Force -Path $evidenceRoot|Out-Null
  return Join-Path $evidenceRoot ('manual-upgrade-'+[DateTime]::UtcNow.ToString('yyyyMMddTHHmmssfffZ')+'.json')
}

function Write-GrMetroManualEvidence([string]$Path,[string]$Stage,[string]$InstalledCommit,[string]$TargetVersion,[string]$Message,[bool]$RolledBack=$false) {
  $payload=[ordered]@{schemaVersion=1;stage=$Stage;installedCommit=$InstalledCommit;targetVersion=$TargetVersion;message=([string]$Message).Substring(0,[Math]::Min(600,([string]$Message).Length));rolledBack=$RolledBack;updatedAt=[DateTime]::UtcNow.ToString('o')}
  $temporary=$Path+'.tmp'
  [IO.File]::WriteAllText($temporary,(($payload|ConvertTo-Json -Depth 4)+[Environment]::NewLine),(New-Object Text.UTF8Encoding $false))
  Move-Item -LiteralPath $temporary -Destination $Path -Force
}

function Test-GrMetroManualLegacyUpgrade {
  param([string]$Root,[string]$Zip,[string]$ExpectedHash,[string]$ExpectedVersion,[string]$ExpectedCommit,[switch]$AllowTestRoot)
  $install=Assert-GrMetroManualLegacyInstallRoot $Root -AllowTestRoot:$AllowTestRoot
  $package=[IO.Path]::GetFullPath($Zip)
  if(-not(Test-Path -LiteralPath $package -PathType Leaf)){throw 'The reviewed portable package ZIP is missing.'}
  $actualHash=(Get-FileHash -LiteralPath $package -Algorithm SHA256).Hash
  if($actualHash-ne$ExpectedHash.ToUpperInvariant()){throw 'Portable package SHA-256 does not match the explicitly approved hash.'}
  $recovery=Get-GrMetroUpgradeRecoveryAction $install
  if($recovery-ne'none'){throw "The installed application has a pending transaction that requires $recovery. Preserve it and complete recovery before manual deployment."}
  $manifestPath=Join-Path $install 'scripts\windows\package-manifest.json'
  if(-not(Test-Path -LiteralPath $manifestPath -PathType Leaf)){throw 'Installed package manifest is missing.'}
  try{$installedManifest=Get-Content -LiteralPath $manifestPath -Raw|ConvertFrom-Json}catch{throw 'Installed package manifest is malformed.'}
  if([int]$installedManifest.version-ne2){throw 'Manual legacy deployment requires an installed portable manifest with schema version 2.'}
  $installedFiles=@(Get-GrMetroManifestFiles $installedManifest)
  foreach($relative in $installedFiles){if(-not(Test-Path -LiteralPath (Get-GrMetroPackageDestination $install $relative)-PathType Leaf)){throw "Installed historical manifest file is missing: $relative"}}
  $legacyIdentity=Get-GrMetroLegacyInstalledIdentity $install $ExpectedCommit
  $target=Get-GrMetroPackageReleaseMetadata $package
  if([string]$target.releaseVersion-ne$ExpectedVersion){throw "Portable package release $($target.releaseVersion) does not match expected release $ExpectedVersion."}
  if([string]$target.channel-notin@('testing','stable')-or[Int64]$target.releaseSequence-lt1){throw 'Manual legacy deployment requires a nondevelopment testing or stable package.'}
  if([string]$target.sourceState-ne'committed'-or[string]$target.commit-notmatch'^[A-Fa-f0-9]{7,40}$'){throw 'Manual legacy deployment requires a package built from an identified committed source snapshot.'}
  if([int]$target.updaterProtocol-gt1){throw "Release $($target.releaseVersion) requires a newer manual deployment protocol."}
  $null=Test-GrMetroPackageArchive $package $install
  return [pscustomobject]@{InstallRoot=$install;PackageZip=$package;PackageSha256=$actualHash;InstalledCommit=[string]$legacyIdentity.commit;InstalledManifestFiles=$installedFiles.Count;Target=$target;RecoveryAction=$recovery}
}

function Invoke-GrMetroManualLegacyUpgrade {
  param(
    [string]$Root,[string]$Zip,[string]$ExpectedHash,[string]$ExpectedVersion,[string]$ExpectedCommit,
    [switch]$ValidateOnly,[switch]$ConfirmDefenderReview,[switch]$ConfirmRollbackSource,[switch]$AllowTestRoot,
    [scriptblock]$CaptureProcessStateAction={param($install);$owned=@(Get-GrMetroOwnedUpgradeProcesses $install);[pscustomobject]@{OperatorWasRunning=[bool]@($owned|Where-Object{$_.Role-eq'operator'});RuntimeWasRunning=[bool]@($owned|Where-Object{$_.Role-in@('supervisor','backend')})}},
    [scriptblock]$StopProcessesAction={param($install) Stop-GrMetroUpgradeProcesses $install},
    [scriptblock]$ValidationAction={param($install,$version) Invoke-GrMetroApplicationValidation -InstallRoot $install -ExpectedReleaseVersion $version},
    [scriptblock]$CompleteAction={param($install) Complete-GrMetroUpgradeTransaction $install},
    [scriptblock]$StartAction={param($install) Start-GrMetroInstalledApplication $install},
    [scriptblock]$RestartAfterFailureAction={param($install,$state) Restart-GrMetroAfterFailedUpgrade $install $state}
  )
  $preflight=Test-GrMetroManualLegacyUpgrade $Root $Zip $ExpectedHash $ExpectedVersion $ExpectedCommit -AllowTestRoot:$AllowTestRoot
  if($ValidateOnly){return $preflight}
  if(-not$ConfirmDefenderReview){throw 'Manual deployment requires explicit confirmation that Defender review completed without a detection.'}
  if(-not$ConfirmRollbackSource){throw 'Manual deployment requires an independently verified post-success rollback source.'}

  $evidence=Get-GrMetroManualEvidencePath $preflight.InstallRoot -AllowTestRoot:$AllowTestRoot
  Write-GrMetroManualEvidence $evidence 'preparing' $preflight.InstalledCommit $preflight.Target.releaseVersion 'Preparing verified rollback data before process shutdown.'
  $transactionPrepared=$false;$commitCompleted=$false;$priorState=$null;$processesMayHaveChanged=$false
  try{
    if((Get-FileHash -LiteralPath $preflight.PackageZip -Algorithm SHA256).Hash-ne$preflight.PackageSha256){throw 'Portable package changed after preflight validation.'}
    $null=Prepare-GrMetroPackageTransaction -PackageZip $preflight.PackageZip -InstallRoot $preflight.InstallRoot -RejectExistingTransaction
    $transactionPrepared=$true
    Write-GrMetroManualEvidence $evidence 'prepared' $preflight.InstalledCommit $preflight.Target.releaseVersion 'Rollback data and journal verified. Stopping GRMetro-owned processes.'
    $priorState=&$CaptureProcessStateAction $preflight.InstallRoot
    $processesMayHaveChanged=$true
    $null=&$StopProcessesAction $preflight.InstallRoot
    $null=Apply-GrMetroPreparedPackageTransaction $preflight.InstallRoot
    Write-GrMetroManualEvidence $evidence 'validating' $preflight.InstalledCommit $preflight.Target.releaseVersion 'Application files replaced. Validating the installed application.'
    $null=&$ValidationAction $preflight.InstallRoot ([string]$preflight.Target.releaseVersion)
    $null=&$CompleteAction $preflight.InstallRoot
    $transactionPrepared=$false
    $commitCompleted=$true
    $null=&$StartAction $preflight.InstallRoot
    try{Write-GrMetroManualEvidence $evidence 'complete' $preflight.InstalledCommit $preflight.Target.releaseVersion 'Manual application deployment completed and validated.'}catch{}
  }catch{
    $failure=$_;$rolledBack=$false;$rollbackFailure=$null
    if($commitCompleted){
      $message="Release $($preflight.Target.releaseVersion) was installed and validated, but the Control Center could not restart: $($failure.Exception.Message)"
      try{Write-GrMetroManualEvidence $evidence 'restart-failed' $preflight.InstalledCommit $preflight.Target.releaseVersion $message}catch{}
      throw $message
    }
    $upgradeRoot=Get-GrMetroUpgradeRoot $preflight.InstallRoot
    $committedCleanupMessage=$null
    if($transactionPrepared-and(Test-Path -LiteralPath $upgradeRoot)){
      try{
        $recovery=Get-GrMetroUpgradeRecoveryAction $preflight.InstallRoot
        $journalPath=Join-Path $upgradeRoot 'journal.json';$journalStatus=$null
        if(Test-Path -LiteralPath $journalPath -PathType Leaf){try{$journalStatus=[string](Get-Content -LiteralPath $journalPath -Raw|ConvertFrom-Json).status}catch{}}
        if($recovery-eq'cleanup'-and$journalStatus-eq'completed'){
          $committedCleanupMessage="Release $($preflight.Target.releaseVersion) was installed and validated, but committed transaction cleanup did not finish: $($failure.Exception.Message) Preserve $upgradeRoot for recovery before retrying."
        }else{$rolledBack=[bool](Restore-GrMetroUpgradeTransaction $preflight.InstallRoot)}
      }catch{$rollbackFailure=$_}
    }
    if($committedCleanupMessage){try{Write-GrMetroManualEvidence $evidence 'commit-cleanup-failed' $preflight.InstalledCommit $preflight.Target.releaseVersion $committedCleanupMessage}catch{};throw $committedCleanupMessage}
    if($processesMayHaveChanged-and-not$rollbackFailure){try{&$RestartAfterFailureAction $preflight.InstallRoot $priorState}catch{$rollbackFailure=$_}}
    $message=if($rollbackFailure){"$($failure.Exception.Message) Automatic rollback also failed: $($rollbackFailure.Exception.Message)"}elseif($rolledBack){"$($failure.Exception.Message) The previous application was restored."}else{"$($failure.Exception.Message) The installed application was unchanged."}
    try{Write-GrMetroManualEvidence $evidence $(if($rollbackFailure){'rollback-failed'}else{'failed'}) $preflight.InstalledCommit $preflight.Target.releaseVersion $message $rolledBack}catch{}
    throw $message
  }
  return [pscustomobject]@{Status='complete';ReleaseVersion=[string]$preflight.Target.releaseVersion;EvidencePath=$evidence;ApplicationStarted=$true}
}

if($MyInvocation.InvocationName-ne'.'){
  if(-not$PackageZip-or-not$ExpectedPackageSha256-or-not$ExpectedReleaseVersion-or-not$ExpectedInstalledCommit){throw 'PackageZip, ExpectedPackageSha256, ExpectedReleaseVersion, and ExpectedInstalledCommit are required.'}
  Invoke-GrMetroManualLegacyUpgrade -Root $InstallRoot -Zip $PackageZip -ExpectedHash $ExpectedPackageSha256 -ExpectedVersion $ExpectedReleaseVersion -ExpectedCommit $ExpectedInstalledCommit -ValidateOnly:$ValidateOnly -ConfirmDefenderReview:$ConfirmDefenderReview -ConfirmRollbackSource:$ConfirmRollbackSource
}
