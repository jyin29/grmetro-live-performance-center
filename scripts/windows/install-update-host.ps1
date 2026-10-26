param(
  [string]$BundlePath,
  [string]$ExpectedBundleSha256,
  [string]$ExpectedInstalledVersion,
  [ValidateSet('testing','stable')][string]$ExpectedChannel,
  [string]$InstallRoot=(Join-Path $env:LOCALAPPDATA 'GRMetro\Performance Center'),
  [switch]$ConfirmUnsignedInternalHost
)
$ErrorActionPreference='Stop'
. (Join-Path $PSScriptRoot 'package-files.ps1')
. (Join-Path $PSScriptRoot 'release-identity.ps1')
. (Join-Path $PSScriptRoot 'release-feed.ps1')
. (Join-Path $PSScriptRoot 'launch-integration.ps1')
. (Join-Path $PSScriptRoot 'update-host-installation.ps1')

function Assert-GrMetroUpdateHostMigrationRoot([string]$Root,[switch]$AllowTestRoot) {
  $resolved=[IO.Path]::GetFullPath($Root).TrimEnd('\')
  if($AllowTestRoot){if($env:GRMETRO_UPDATER_TEST_MODE-ne'true'){throw 'Disposable Update Host roots are disabled outside tests.'}}
  else{$expected=[IO.Path]::GetFullPath((Join-Path $env:LOCALAPPDATA 'GRMetro\Performance Center')).TrimEnd('\');if($resolved-ne$expected){throw 'Update Host migration targets only the installed per-user GRMetro application.'}}
  if(-not(Test-Path -LiteralPath $resolved -PathType Container)){throw 'The installed GRMetro application is missing.'}
  $current=$resolved;while($current){if(Test-Path -LiteralPath $current){if((Get-Item -LiteralPath $current -Force).Attributes-band[IO.FileAttributes]::ReparsePoint){throw 'The GRMetro installation path contains a reparse point.'}};$current=[IO.Path]::GetDirectoryName($current)}
  return $resolved
}

function Install-GrMetroUpdateHostMigration {
  param(
    [string]$Root,[string]$Bundle,[string]$ExpectedHash,[string]$InstalledVersion,[string]$Channel,
    [switch]$ConfirmUnsigned,[switch]$AllowTestRoot,
    [scriptblock]$SignatureAction={param($path)Get-AuthenticodeSignature -LiteralPath $path},
    [scriptblock]$DiscoveryAction={param($install,$state,$source,$keys,$allowTest) Get-GrMetroReleaseCheck -InstallRoot $install -StateRoot $state -ReleaseSourcePath $source -PublicKeysPath $keys -UpdaterProtocol 1 -AllowTestRoot:$allowTest -ReadOnly},
    [scriptblock]$SaveLaunchAction={param($install)Save-GrMetroLaunchIntegrationState $install},
    [scriptblock]$SetLaunchAction={param($install,$enabled)Set-GrMetroLaunchIntegration $install $enabled},
    [scriptblock]$RestoreLaunchAction={param($state)Restore-GrMetroLaunchIntegration $state}
  )
  $install=Assert-GrMetroUpdateHostMigrationRoot $Root -AllowTestRoot:$AllowTestRoot
  $bundlePath=[IO.Path]::GetFullPath($Bundle)
  if(-not(Test-Path -LiteralPath $bundlePath -PathType Leaf)){throw 'The Update Host migration bundle is missing.'}
  $hash=([string]$ExpectedHash).ToUpperInvariant();if($hash-notmatch'^[A-F0-9]{64}$'){throw 'The approved Update Host bundle SHA-256 is invalid.'}
  if((Get-FileHash -LiteralPath $bundlePath -Algorithm SHA256).Hash-ne$hash){throw 'The Update Host migration bundle SHA-256 does not match the approved value.'}
  $installed=Get-GrMetroInstalledReleaseMetadata $install
  if($InstalledVersion-and[string]$installed.releaseVersion-ne$InstalledVersion){throw "Installed GRMetro version $($installed.releaseVersion) does not match the approved migration baseline."}
  if([string]$installed.channel-ne$Channel){throw "Installed GRMetro channel $($installed.channel) does not match the approved $Channel Update Host source."}
  $recovery=Get-GrMetroUpgradeRecoveryAction $install;if($recovery-ne'none'){throw "A pending application transaction requires $recovery before Update Host migration."}
  $hostState=$null;$launchState=$null
  try{
    $hostState=Install-GrMetroStableUpdateHost $bundlePath
    if(-not$hostState.ApplyOnSetup){throw 'The migration bundle does not explicitly provision release trust.'}
    if($hostState.SourceChannel-ne$Channel){throw "The migration bundle channel $($hostState.SourceChannel) does not match the approved $Channel channel."}
    $signature=&$SignatureAction $hostState.HostExecutable
    if([string]$signature.Status-ne'Valid'-and-not$ConfirmUnsigned){throw 'The Update Host is not Authenticode-signed. Explicit internal unsigned-host approval is required.'}
    $keysPath=Join-Path $hostState.Destination 'release-public-keys.json'
    $discovery=&$DiscoveryAction $install $hostState.StateRoot $hostState.SourceConfig $keysPath ([bool]$AllowTestRoot)
    if([string]$discovery.status-notin@('available','up-to-date','requires-setup')){throw 'The trusted release source did not return a valid update-discovery result.'}
    $choicePath=Join-Path $install '.grmetro-autostart-choice';$choice=if(Test-Path -LiteralPath $choicePath -PathType Leaf){(Get-Content -LiteralPath $choicePath -Raw).Trim().ToLowerInvariant()}else{'no'}
    if($choice-notin@('yes','no')){throw 'The installed autostart choice is invalid.'}
    $launchState=&$SaveLaunchAction $install
    $launchPaths=&$SetLaunchAction $install ($choice-eq'yes')
    Complete-GrMetroStableUpdateHost $hostState;$hostState=$null;$launchState=$null
    return [pscustomobject]@{Status='installed';InstallRoot=$install;InstalledVersion=[string]$installed.releaseVersion;Channel=$Channel;BundleSha256=$hash;UpdateHost=$launchPaths.HostExecutable;UpdateDiscoveryStatus=[string]$discovery.status;LatestRelease=[string]$discovery.latest;AutostartEnabled=($choice-eq'yes');AuthenticodeStatus=[string]$signature.Status;RecoveryAction=$recovery}
  }catch{
    $failure=$_;$rollbackFailure=$null
    if($launchState){try{&$RestoreLaunchAction $launchState}catch{$rollbackFailure=$_}}
    if($hostState){try{Restore-GrMetroStableUpdateHost $hostState}catch{if(-not$rollbackFailure){$rollbackFailure=$_}}}
    if($rollbackFailure){throw "Update Host migration failed: $($failure.Exception.Message). Rollback also failed: $($rollbackFailure.Exception.Message)"}
    throw $failure
  }
}

if($MyInvocation.InvocationName-ne'.'){
  if(-not$BundlePath-or-not$ExpectedBundleSha256-or-not$ExpectedInstalledVersion-or-not$ExpectedChannel){throw 'BundlePath, ExpectedBundleSha256, ExpectedInstalledVersion, and ExpectedChannel are required.'}
  Install-GrMetroUpdateHostMigration -Root $InstallRoot -Bundle $BundlePath -ExpectedHash $ExpectedBundleSha256 -InstalledVersion $ExpectedInstalledVersion -Channel $ExpectedChannel -ConfirmUnsigned:$ConfirmUnsignedInternalHost
}
