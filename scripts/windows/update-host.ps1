param(
  [ValidateSet('Launch','Check','ApplyLocal','PrepareRemote')][string]$Mode='Launch',
  [string]$InstallRoot=(Join-Path $env:LOCALAPPDATA 'GRMetro\Performance Center'),
  [string]$PackageZip,
  [string]$ExpectedReleaseVersion,
  [string]$StateRoot=(Join-Path $env:LOCALAPPDATA 'GRMetro\Update State'),
  [string]$ReleaseSourcePath,
  [string]$PublicKeysPath=(Join-Path $PSScriptRoot 'release-public-keys.json'),
  [string]$StatusPath,
  [int]$ParentProcessId=0,
  [switch]$AllowDevelopmentPackage,
  [switch]$AllowInsecureTestTransport,
  [switch]$AllowTestRoot,
  [switch]$Quiet,
  [switch]$SkipValidation,
  [switch]$NoLaunch
)
$ErrorActionPreference='Stop'
. (Join-Path $PSScriptRoot 'package-files.ps1')
. (Join-Path $PSScriptRoot 'process-control.ps1')
. (Join-Path $PSScriptRoot 'application-validation.ps1')
. (Join-Path $PSScriptRoot 'release-identity.ps1')
. (Join-Path $PSScriptRoot 'release-feed.ps1')
. (Join-Path $PSScriptRoot 'authenticode-signing.ps1')

$StateRoot=Assert-GrMetroUpdaterOwnedRoot $StateRoot -AllowTestRoot:$AllowTestRoot
if(Test-Path -LiteralPath $StateRoot){Remove-GrMetroAbandonedUpdaterFiles $StateRoot -AllowTestRoot:$AllowTestRoot}
if(-not$ReleaseSourcePath){$ReleaseSourcePath=Join-Path $StateRoot 'release-source.json'}
$defaultSource=Join-Path ([IO.Path]::GetFullPath((Join-Path $env:LOCALAPPDATA 'GRMetro\Update State')).TrimEnd('\')) 'release-source.json'
if(($AllowInsecureTestTransport-or$AllowTestRoot-or[IO.Path]::GetFullPath($ReleaseSourcePath)-ne$defaultSource-or$PublicKeysPath-ne(Join-Path $PSScriptRoot 'release-public-keys.json'))-and$env:GRMETRO_UPDATER_TEST_MODE-ne'true'){throw 'Updater test transport/path overrides are disabled outside disposable tests.'}
if($StatusPath){$statusFull=[IO.Path]::GetFullPath($StatusPath);if([IO.Path]::GetDirectoryName($statusFull)-ne$StateRoot){throw 'Update status path must be directly inside the updater state directory.'};$StatusPath=$statusFull}

$script:statusForm=$null;$script:statusLabel=$null
function Initialize-GrMetroUpdateStatus {
  if($Quiet){return}
  Add-Type -AssemblyName System.Windows.Forms,System.Drawing
  $script:statusForm=New-Object Windows.Forms.Form
  $script:statusForm.Text='GRMetro Application Update';$script:statusForm.Width=520;$script:statusForm.Height=180;$script:statusForm.StartPosition='CenterScreen';$script:statusForm.FormBorderStyle='FixedDialog';$script:statusForm.MaximizeBox=$false;$script:statusForm.MinimizeBox=$false
  $title=New-Object Windows.Forms.Label;$title.Text='GRMetro Performance Center';$title.Font=New-Object Drawing.Font('Segoe UI',16,[Drawing.FontStyle]::Bold);$title.AutoSize=$true;$title.Location=New-Object Drawing.Point(24,22)
  $script:statusLabel=New-Object Windows.Forms.Label;$script:statusLabel.Text='Preparing...';$script:statusLabel.Font=New-Object Drawing.Font('Segoe UI',10);$script:statusLabel.AutoSize=$true;$script:statusLabel.Location=New-Object Drawing.Point(27,72)
  $bar=New-Object Windows.Forms.ProgressBar;$bar.Style='Marquee';$bar.MarqueeAnimationSpeed=25;$bar.Width=448;$bar.Height=8;$bar.Location=New-Object Drawing.Point(28,108)
  $script:statusForm.Controls.AddRange(@($title,$script:statusLabel,$bar));$script:statusForm.Show();[Windows.Forms.Application]::DoEvents()
}
function Set-GrMetroUpdateStatus([string]$Text,[string]$Stage='working',[int]$Percent=-1){
  if(-not$Quiet){Write-Output $Text}
  if($StatusPath){New-Item -ItemType Directory -Force -Path $StateRoot|Out-Null;$payload=[ordered]@{schemaVersion=1;stage=$Stage;message=$Text;percent=$Percent;updatedAt=[DateTime]::UtcNow.ToString('o')};$temporary=$StatusPath+'.tmp';[IO.File]::WriteAllText($temporary,(($payload|ConvertTo-Json -Compress)+[Environment]::NewLine),(New-Object Text.UTF8Encoding $false));Move-Item -LiteralPath $temporary -Destination $StatusPath -Force}
  if($script:statusLabel){$script:statusLabel.Text=$Text;[Windows.Forms.Application]::DoEvents()}
}
function Close-GrMetroUpdateStatus {if($script:statusForm){$script:statusForm.Close();$script:statusForm.Dispose()}}
function Show-GrMetroUpdateFailure([string]$Message){if(-not$Quiet){[Windows.Forms.MessageBox]::Show($Message,'GRMetro Update Failed',[Windows.Forms.MessageBoxButtons]::OK,[Windows.Forms.MessageBoxIcon]::Error)|Out-Null}}
function Get-GrMetroSafeUpdateError([string]$Message){$safe=[string]$Message;foreach($path in @($InstallRoot,$StateRoot,$PSScriptRoot)){if($path){$safe=$safe.Replace([IO.Path]::GetFullPath($path),'the GRMetro installation')}};$safe=$safe.Trim();if($safe.Length-gt600){$safe=$safe.Substring(0,600)};return $safe}

function Invoke-GrMetroPendingRecovery([string]$Root) {
  $action=Get-GrMetroUpgradeRecoveryAction $Root
  switch($action){
    'none'{return [pscustomobject]@{Action='none';RolledBack=$false}}
    'cleanup'{Set-GrMetroUpdateStatus 'Finishing previous update cleanup...';$null=Restore-GrMetroUpgradeTransaction $Root;return [pscustomobject]@{Action='cleanup';RolledBack=$false}}
    'rollback'{
      Set-GrMetroUpdateStatus 'Restoring the previous application version...'
      $state=Stop-GrMetroUpgradeProcesses $Root
      $restored=Restore-GrMetroUpgradeTransaction $Root
      return [pscustomobject]@{Action='rollback';RolledBack=[bool]$restored;PriorState=$state}
    }
    default{throw "Unsafe or unsupported GRMetro recovery action: $action"}
  }
}

$deferWindow=$Mode-eq'PrepareRemote'-and$ParentProcessId-gt0
if(-not$deferWindow){Initialize-GrMetroUpdateStatus}
$priorState=$null
try{
  Set-GrMetroUpdateStatus 'Checking application recovery state...'
  $recovery=Invoke-GrMetroPendingRecovery $InstallRoot
  if($Mode-eq'Check'){
    $result=Get-GrMetroReleaseCheck -InstallRoot $InstallRoot -StateRoot $StateRoot -ReleaseSourcePath $ReleaseSourcePath -PublicKeysPath $PublicKeysPath -UpdaterProtocol 1 -AllowInsecureTestTransport:$AllowInsecureTestTransport -AllowTestRoot:$AllowTestRoot
    Close-GrMetroUpdateStatus;$result|ConvertTo-Json -Compress -Depth 8;exit 0
  }
  if($Mode -eq 'Launch'){
    if(-not$NoLaunch){Set-GrMetroUpdateStatus 'Opening GRMetro Performance Center...';Start-GrMetroInstalledApplication $InstallRoot}
    Close-GrMetroUpdateStatus;exit 0
  }
  if($Mode-eq'PrepareRemote'){
    Set-GrMetroUpdateStatus 'Verifying release signature...' 'verifying-signature'
    $release=Get-GrMetroReleaseCheck -InstallRoot $InstallRoot -StateRoot $StateRoot -ReleaseSourcePath $ReleaseSourcePath -PublicKeysPath $PublicKeysPath -UpdaterProtocol 1 -AllowInsecureTestTransport:$AllowInsecureTestTransport -AllowTestRoot:$AllowTestRoot
    if($release.status-eq'requires-setup'){throw 'This update requires a newer GRMetro Setup.'}
    if(-not$release.updateAvailable){throw 'No newer verified GRMetro release is available.'}
    if($ExpectedReleaseVersion-and$release.latest-ne$ExpectedReleaseVersion){throw "Verified release $($release.latest) does not match expected release $ExpectedReleaseVersion."}
    Set-GrMetroUpdateStatus 'Downloading update...' 'downloading' 0
    $script:lastDownloadPercent=-1;$PackageZip=Receive-GrMetroVerifiedReleasePackage $release $StateRoot -AllowInsecureTestTransport:$AllowInsecureTestTransport -AllowTestRoot:$AllowTestRoot -ProgressAction {param($received,$total);$percent=if($total-gt0){[Math]::Min(100,[int](100*$received/$total))}else{-1};if($percent-ne$script:lastDownloadPercent){$script:lastDownloadPercent=$percent;Set-GrMetroUpdateStatus "Downloading... $percent%" 'downloading' $percent}}
    Set-GrMetroUpdateStatus 'Verifying package manifest...' 'verifying-package'
    $null=Test-GrMetroPackageArchive $PackageZip $InstallRoot
    if((Get-FileHash -LiteralPath $PackageZip -Algorithm SHA256).Hash-ne[string]$release.artifactSha256){throw 'Verified package changed before transaction preparation.'}
    $target=Get-GrMetroPackageReleaseMetadata $PackageZip
    if([string]$target.releaseVersion-ne[string]$release.latest-or[Int64]$target.releaseSequence-ne[Int64]$release.releaseSequence-or[string]$target.channel-ne[string]$release.metadata.channel-or[int]$target.updaterProtocol-ne[int]$release.metadata.minimumUpdaterProtocol){throw 'Verified package identity does not match signed release metadata.'}
  }else{
    if(-not$PackageZip-or-not(Test-Path -LiteralPath $PackageZip -PathType Leaf)){throw 'A local portable package ZIP is required for this update operation.'}
    Set-GrMetroUpdateStatus 'Reading release identity...'
    $current=Get-GrMetroInstalledReleaseMetadata $InstallRoot;$target=Get-GrMetroPackageReleaseMetadata $PackageZip
    if($ExpectedReleaseVersion-and[string]$target.releaseVersion-ne$ExpectedReleaseVersion){throw "Package release $($target.releaseVersion) does not match expected release $ExpectedReleaseVersion."}
    if([int]$target.updaterProtocol-gt1){throw "Release $($target.releaseVersion) requires a newer GRMetro Update Host."}
    if($AllowDevelopmentPackage){$null=ConvertTo-GrMetroReleaseVersion ([string]$target.releaseVersion) -AllowDevelopment}else{$null=Assert-GrMetroUpgradeVersion ([string]$current.releaseVersion) ([string]$target.releaseVersion)}
    $null=Test-GrMetroPackageArchive $PackageZip $InstallRoot
  }
  Set-GrMetroUpdateStatus 'Preparing rollback backup...' 'preparing'
  $null=Prepare-GrMetroPackageTransaction -PackageZip $PackageZip -InstallRoot $InstallRoot
  if($Mode-eq'PrepareRemote'-and$release.authenticodeRequired){$stagedLauncher=Join-Path (Get-GrMetroUpgradeRoot $InstallRoot) 'stage\GRMetro Performance Center.exe';$null=Assert-GrMetroAuthenticodeSignature $stagedLauncher $null}
  Set-GrMetroUpdateStatus 'Ready to install...' 'ready-to-install' 100
  if($ParentProcessId -gt 0){
    Set-GrMetroUpdateStatus 'Ready to install. Waiting for the Control Center to close...' 'ready-to-install' 100
    try{Wait-Process -Id $ParentProcessId -Timeout 30 -ErrorAction Stop}catch{if(Get-Process -Id $ParentProcessId -ErrorAction SilentlyContinue){throw 'The Control Center did not close before application replacement.'}}
  }
  if($deferWindow){$Quiet=$false;Initialize-GrMetroUpdateStatus}
  Set-GrMetroUpdateStatus 'Stopping GRMetro application processes...' 'stopping'
  $priorState=Stop-GrMetroUpgradeProcesses $InstallRoot
  Set-GrMetroUpdateStatus 'Installing the new application...' 'installing'
  $null=Apply-GrMetroPreparedPackageTransaction $InstallRoot
  if(-not$SkipValidation){Set-GrMetroUpdateStatus 'Validating backend...' 'validating';$null=Invoke-GrMetroApplicationValidation -InstallRoot $InstallRoot -ExpectedReleaseVersion ([string]$target.releaseVersion)}
  Set-GrMetroUpdateStatus 'Completing the update...' 'completing'
  Complete-GrMetroUpgradeTransaction $InstallRoot
  Set-GrMetroUpdateStatus "Updated successfully to $($target.releaseVersion). Backend healthy." 'complete' 100
  if(-not$NoLaunch){Start-Sleep -Milliseconds 750;Start-GrMetroInstalledApplication $InstallRoot}
  Close-GrMetroUpdateStatus;exit 0
}catch{
  $failure=$_;$safeFailure=Get-GrMetroSafeUpdateError $failure.Exception.Message
  try{
    $upgradeRoot=Get-GrMetroUpgradeRoot $InstallRoot
    if(Test-Path -LiteralPath $upgradeRoot){Set-GrMetroUpdateStatus 'Update failed. Restoring the previous version...' 'rolling-back';$null=Restore-GrMetroUpgradeTransaction $InstallRoot}
    if($priorState){Restart-GrMetroAfterFailedUpgrade $InstallRoot $priorState}
  }catch{$rollbackFailure=$_;$safeRollback=Get-GrMetroSafeUpdateError $rollbackFailure.Exception.Message;Set-GrMetroUpdateStatus "Update failed and automatic rollback failed: $safeRollback" 'rollback-failed';if($Quiet){[Console]::Error.WriteLine($safeFailure)};Close-GrMetroUpdateStatus;Show-GrMetroUpdateFailure "Update failed: $safeFailure`r`n`r`nAutomatic rollback also failed: $safeRollback";exit 2}
  Set-GrMetroUpdateStatus "Update failed. Previous version restored. Reason: $safeFailure" 'failed'
  if($Quiet){[Console]::Error.WriteLine($safeFailure)}
  Close-GrMetroUpdateStatus;Show-GrMetroUpdateFailure "Update failed. The previous application version was restored.`r`n`r`n$safeFailure";exit 1
}
