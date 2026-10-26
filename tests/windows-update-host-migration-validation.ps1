$ErrorActionPreference='Stop'
$repository=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..')).TrimEnd('\')
$savedLocal=$env:LOCALAPPDATA;$savedApp=$env:APPDATA;$savedTestMode=$env:GRMETRO_UPDATER_TEST_MODE
$fixture=Join-Path ([IO.Path]::GetTempPath()) ('grmetro host migration '+[guid]::NewGuid().ToString('N'))
function Assert($condition,[string]$message){if(-not$condition){throw $message}}
function Expect-Failure([scriptblock]$action,[string]$pattern,[string]$message){$failure=$null;try{&$action}catch{$failure=$_.Exception.Message};Assert ($failure-and$failure-match$pattern) "$message Actual: $failure"}
function Write-Text([string]$path,[string]$value){New-Item -ItemType Directory -Force -Path ([IO.Path]::GetDirectoryName($path))|Out-Null;[IO.File]::WriteAllText($path,$value,(New-Object Text.UTF8Encoding($false)))}
try{
  $env:LOCALAPPDATA=Join-Path $fixture 'LocalAppData';$env:APPDATA=Join-Path $fixture 'AppData';$env:GRMETRO_UPDATER_TEST_MODE='true'
  . (Join-Path $repository 'scripts\windows\package-files.ps1')
  . (Join-Path $repository 'scripts\windows\release-identity.ps1')
  . (Join-Path $repository 'scripts\windows\release-feed.ps1')
  . (Join-Path $repository 'scripts\windows\launch-integration.ps1')
  . (Join-Path $repository 'scripts\windows\update-host-installation.ps1')
  . (Join-Path $repository 'scripts\windows\install-update-host.ps1')
  $install=Join-Path $env:LOCALAPPDATA 'GRMetro\Performance Center';New-Item -ItemType Directory -Force -Path $install|Out-Null
  $identity=New-GrMetroReleaseMetadata -ReleaseVersion '2026.10.21.2' -Channel testing -Commit ('a'*40) -SourceState committed -BuiltAt '2026-10-21T12:00:00Z' -UpdaterProtocol 1 -NodeVersion 'v24.18.1'
  Write-Text (Join-Path $install 'scripts\windows\package-build.json') (($identity|ConvertTo-Json -Depth 4)+[Environment]::NewLine)
  Write-Text (Join-Path $install 'scripts\windows\package-manifest.json') '{"version":2,"files":["scripts/windows/package-build.json","scripts/windows/package-manifest.json"]}'
  Write-Text (Join-Path $install '.grmetro-autostart-choice') 'no';Write-Text (Join-Path $install '.env') 'SYNTHETIC PRIVATE CONFIG';Write-Text (Join-Path $install 'data\settings.json') 'SYNTHETIC SETTINGS';Write-Text (Join-Path $install 'GRMetro Performance Center.exe') 'APPLICATION SENTINEL'
  $rsa=New-Object Security.Cryptography.RSACryptoServiceProvider 3072;$rsa.PersistKeyInCsp=$false;$publicXml=$rsa.ToXmlString($false);$rsa.Dispose()
  $bundleRoot=Join-Path $fixture 'bundle';New-Item -ItemType Directory -Force -Path $bundleRoot|Out-Null
  foreach($name in @('GRMetro Update Host.exe','update-host.ps1','package-files.ps1','process-control.ps1','application-validation.ps1','release-identity.ps1','authenticode-signing.ps1')){Write-Text (Join-Path $bundleRoot $name) "NEW HOST $name"}
  Copy-Item -LiteralPath (Join-Path $repository 'scripts\windows\release-feed.ps1') -Destination (Join-Path $bundleRoot 'release-feed.ps1')
  $source=[ordered]@{schemaVersion=1;enabled=$true;metadataUrl='https://updates.test.invalid/staging/release.json';signatureUrl='https://updates.test.invalid/staging/release.json.sig';channel='testing';allowedHosts=@('updates.test.invalid');connectionTimeoutSeconds=10;responseTimeoutSeconds=30;maximumMetadataBytes=262144;maximumArtifactBytes=268435456;maximumRedirects=1};Write-Text (Join-Path $bundleRoot 'release-source.default.json') ($source|ConvertTo-Json -Depth 4)
  $keys=[ordered]@{schemaVersion=1;keys=@([ordered]@{keyId='migration-test';algorithm='RSA-SHA256';publicKeyXml=$publicXml;fingerprintSha256=(Get-GrMetroPublicKeyFingerprint $publicXml);allowedChannels=@('testing');testOnly=$false})};Write-Text (Join-Path $bundleRoot 'release-public-keys.json') ($keys|ConvertTo-Json -Depth 5)
  Write-Text (Join-Path $bundleRoot 'provisioning-policy.json') '{"schemaVersion":1,"applyOnSetup":true,"updaterProtocol":1}'
  Add-Type -AssemblyName System.IO.Compression.FileSystem;$bundle=Join-Path $fixture 'host-migration.zip';[IO.Compression.ZipFile]::CreateFromDirectory($bundleRoot,$bundle);$hash=(Get-FileHash $bundle -Algorithm SHA256).Hash
  $script:saved=0;$script:set=0;$script:restored=0
  $signatureAction={param($path)[pscustomobject]@{Status='NotSigned'}}
  $discoveryAction={param($app,$state,$sourcePath,$keyPath,$allowTest) Assert ($app-eq$install) 'Discovery received the wrong application root.';Assert (-not(Test-Path (Join-Path $state 'trust-state.json'))) 'Read-only discovery received prewritten trust state.';Assert (Test-Path $sourcePath) 'Provisioned source missing.';Assert (Test-Path $keyPath) 'Provisioned key set missing.';[pscustomobject]@{status='up-to-date';latest='2026.10.8.1'}}
  $saveAction={param($app)$script:saved++;[pscustomobject]@{Token='shortcuts'}}
  $setAction={param($app,$enabled)$script:set++;Assert (-not$enabled) 'Disabled autostart was enabled.';[pscustomobject]@{HostExecutable=(Join-Path $env:LOCALAPPDATA 'GRMetro\Update Host\GRMetro Update Host.exe')}}
  $restoreAction={param($state)$script:restored++}
  $validation=Test-GrMetroUpdateHostMigration -Root $install -Bundle $bundle -ExpectedHash $hash -InstalledVersion '2026.10.21.2' -Channel testing -ConfirmUnsigned -AllowTestRoot -SignatureAction $signatureAction -DiscoveryAction $discoveryAction
  Assert ($validation.Status-eq'validated'-and-not(Test-Path (Join-Path $env:LOCALAPPDATA 'GRMetro\Update Host'))) 'ValidateOnly preflight mutated the host destination.';Assert (-not(Test-Path (Join-Path $env:LOCALAPPDATA 'GRMetro\Update State'))) 'ValidateOnly preflight mutated updater state.'
  $result=Install-GrMetroUpdateHostMigration -Root $install -Bundle $bundle -ExpectedHash $hash -InstalledVersion '2026.10.21.2' -Channel testing -ConfirmUnsigned -AllowTestRoot -SignatureAction $signatureAction -DiscoveryAction $discoveryAction -SaveLaunchAction $saveAction -SetLaunchAction $setAction -RestoreLaunchAction $restoreAction
  Assert ($result.Status-eq'installed'-and$result.UpdateDiscoveryStatus-eq'up-to-date') 'Valid migration did not complete.';Assert ($script:saved-eq1-and$script:set-eq1-and$script:restored-eq0) 'Launch integration actions were incorrect.'
  Assert ((Get-Content (Join-Path $install '.env')-Raw)-eq'SYNTHETIC PRIVATE CONFIG') 'Migration changed private configuration.';Assert ((Get-Content (Join-Path $install 'data\settings.json')-Raw)-eq'SYNTHETIC SETTINGS') 'Migration changed persistent settings.';Assert ((Get-Content (Join-Path $install 'GRMetro Performance Center.exe')-Raw)-eq'APPLICATION SENTINEL') 'Migration changed the application.'
  Assert (Test-Path (Join-Path $env:LOCALAPPDATA 'GRMetro\Update Host\GRMetro Update Host.exe')) 'Update Host was not installed.';Assert ((Get-Content (Join-Path $env:LOCALAPPDATA 'GRMetro\Update State\release-source.json')-Raw)-match'updates.test.invalid') 'Release source was not provisioned.'
  Write-Output 'PASS: host-only migration provisions trust, preserves the application/private state, migrates launch integration, and retains disabled autostart.'

  $hostExe=Join-Path $env:LOCALAPPDATA 'GRMetro\Update Host\GRMetro Update Host.exe';Write-Text $hostExe 'PREVIOUS HOST';$priorHostHash=(Get-FileHash $hostExe -Algorithm SHA256).Hash;$sourcePath=Join-Path $env:LOCALAPPDATA 'GRMetro\Update State\release-source.json';$priorSource=[IO.File]::ReadAllBytes($sourcePath)
  Expect-Failure {Install-GrMetroStableUpdateHost $bundle -SourceInstallAction {throw 'SYNTHETIC SOURCE COPY FAILURE'}} 'SYNTHETIC SOURCE COPY FAILURE' 'Late source-policy failure was not surfaced.'
  Assert ((Get-FileHash $hostExe -Algorithm SHA256).Hash-eq$priorHostHash) 'Late installation failure did not restore the previous host.';Assert ([Convert]::ToBase64String([IO.File]::ReadAllBytes($sourcePath))-eq[Convert]::ToBase64String($priorSource)) 'Late installation failure did not restore the source policy.'
  $failingDiscovery={throw 'SYNTHETIC DISCOVERY FAILURE'}
  Expect-Failure {Install-GrMetroUpdateHostMigration -Root $install -Bundle $bundle -ExpectedHash $hash -InstalledVersion '2026.10.21.2' -Channel testing -ConfirmUnsigned -AllowTestRoot -SignatureAction $signatureAction -DiscoveryAction $failingDiscovery -SaveLaunchAction $saveAction -SetLaunchAction $setAction -RestoreLaunchAction $restoreAction} 'SYNTHETIC DISCOVERY FAILURE' 'Discovery failure was not surfaced.'
  Assert ((Get-FileHash $hostExe -Algorithm SHA256).Hash-eq$priorHostHash) 'Failed migration did not restore the previous host.';Assert ([Convert]::ToBase64String([IO.File]::ReadAllBytes($sourcePath))-eq[Convert]::ToBase64String($priorSource)) 'Failed migration did not restore the previous source policy.'
  Expect-Failure {Install-GrMetroUpdateHostMigration -Root $install -Bundle $bundle -ExpectedHash ('0'*64) -InstalledVersion '2026.10.21.2' -Channel testing -ConfirmUnsigned -AllowTestRoot -SignatureAction $signatureAction -DiscoveryAction $discoveryAction -SaveLaunchAction $saveAction -SetLaunchAction $setAction -RestoreLaunchAction $restoreAction} 'SHA-256' 'Incorrect bundle hash was accepted.'
  Expect-Failure {Install-GrMetroUpdateHostMigration -Root $install -Bundle $bundle -ExpectedHash $hash -InstalledVersion '2026.10.21.2' -Channel testing -AllowTestRoot -SignatureAction $signatureAction -DiscoveryAction $discoveryAction -SaveLaunchAction $saveAction -SetLaunchAction $setAction -RestoreLaunchAction $restoreAction} 'unsigned-host approval' 'Unsigned host was accepted without explicit approval.'
  Expect-Failure {Install-GrMetroUpdateHostMigration -Root $install -Bundle $bundle -ExpectedHash $hash -InstalledVersion '2026.10.21.2' -Channel stable -ConfirmUnsigned -AllowTestRoot -SignatureAction $signatureAction -DiscoveryAction $discoveryAction -SaveLaunchAction $saveAction -SetLaunchAction $setAction -RestoreLaunchAction $restoreAction} 'channel' 'Channel mismatch was accepted.'
  New-Item -ItemType Directory -Force -Path ($install+'.upgrade-transaction')|Out-Null;Write-Text (Join-Path ($install+'.upgrade-transaction') 'journal.json') '{"version":2,"status":"prepared","installRoot":"invalid","files":[]}'
  Expect-Failure {Install-GrMetroUpdateHostMigration -Root $install -Bundle $bundle -ExpectedHash $hash -InstalledVersion '2026.10.21.2' -Channel testing -ConfirmUnsigned -AllowTestRoot -SignatureAction $signatureAction -DiscoveryAction $discoveryAction -SaveLaunchAction $saveAction -SetLaunchAction $setAction -RestoreLaunchAction $restoreAction} 'pending application transaction|Invalid upgrade recovery journal' 'Pending application transaction was ignored.'
  Write-Output 'PASS: hash, signature approval, channel, discovery, rollback, and pending-transaction gates fail closed.'
}finally{
  $env:LOCALAPPDATA=$savedLocal;$env:APPDATA=$savedApp;$env:GRMETRO_UPDATER_TEST_MODE=$savedTestMode
  $cleanup=[IO.Path]::GetFullPath($fixture);$temp=[IO.Path]::GetFullPath([IO.Path]::GetTempPath()).TrimEnd('\');if([IO.Path]::GetDirectoryName($cleanup)-ne$temp-or[IO.Path]::GetFileName($cleanup)-notlike'grmetro host migration *'){throw 'Unsafe migration fixture cleanup path.'};if(Test-Path -LiteralPath $cleanup){Remove-Item -LiteralPath $cleanup -Recurse -Force}
}
