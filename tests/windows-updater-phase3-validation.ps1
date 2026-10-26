$ErrorActionPreference='Stop'
$repository=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..')).TrimEnd('\')
. (Join-Path $repository 'scripts\windows/package-files.ps1')
. (Join-Path $repository 'scripts\windows/release-feed.ps1')
. (Join-Path $repository 'scripts\windows/authenticode-signing.ps1')
. (Join-Path $repository 'scripts\windows/launch-integration.ps1')
. (Join-Path $repository 'scripts\windows/update-host-installation.ps1')
function Assert($condition,[string]$message){if(-not$condition){throw $message}}
function Expect-Failure([scriptblock]$action,[string]$message){$failed=$false;try{&$action}catch{$failed=$true};Assert $failed $message}
function Write-Text([string]$path,[string]$value){New-Item -ItemType Directory -Force -Path ([IO.Path]::GetDirectoryName($path))|Out-Null;[IO.File]::WriteAllText($path,$value,(New-Object Text.UTF8Encoding $false))}
$fixture=Join-Path ([IO.Path]::GetTempPath()) ('grmetro updater phase3 '+[guid]::NewGuid());$savedLocal=$env:LOCALAPPDATA;$savedApp=$env:APPDATA
try{
  $env:LOCALAPPDATA=Join-Path $fixture 'LocalAppData';$env:APPDATA=Join-Path $fixture 'AppData'
  $install=Join-Path $env:LOCALAPPDATA 'GRMetro\Performance Center';$hostRoot=Join-Path $env:LOCALAPPDATA 'GRMetro\Update Host';$hostExe=Join-Path $hostRoot 'GRMetro Update Host.exe';$appExe=Join-Path $install 'GRMetro Performance Center.exe'
  Write-Text $hostExe 'HOST';Write-Text $appExe 'APP';$desktop=Join-Path $fixture 'Desktop';$startMenu=Join-Path $fixture 'Start Menu\GRMetro';New-Item -ItemType Directory -Force -Path $desktop,$startMenu|Out-Null
  $shell=New-Object -ComObject WScript.Shell;$oldDesktop=Join-Path $desktop 'GRMetro Performance Center.lnk';$oldStart=Join-Path $startMenu 'GRMetro Performance Center.lnk'
  foreach($path in @($oldDesktop,$oldStart)){$lnk=$shell.CreateShortcut($path);$lnk.TargetPath=$appExe;$lnk.WorkingDirectory=$install;$lnk.Save()};$desktopHash=(Get-FileHash $oldDesktop -Algorithm SHA256).Hash;$startHash=(Get-FileHash $oldStart -Algorithm SHA256).Hash
  $script:mockTask=[pscustomobject]@{TaskName=$script:GrMetroAutostartTaskName};$script:registeredAction=$null;$script:registeredXml=$null;$script:unregistered=$false
  function Get-ScheduledTask{param($TaskName,$ErrorAction);return $script:mockTask}
  function Export-ScheduledTask{param($TaskName);return '<Task>OLD TASK</Task>'}
  function New-ScheduledTaskAction{param($Execute,$Argument,$WorkingDirectory);$script:registeredAction=[pscustomobject]@{Execute=$Execute;Argument=$Argument;WorkingDirectory=$WorkingDirectory};return $script:registeredAction}
  function New-ScheduledTaskTrigger{param([switch]$AtLogOn,$User);[pscustomobject]@{}}
  function New-ScheduledTaskSettingsSet{param([switch]$AllowStartIfOnBatteries,[switch]$DontStopIfGoingOnBatteries,[switch]$StartWhenAvailable,$RestartCount,$RestartInterval,$ExecutionTimeLimit);[pscustomobject]@{}}
  function New-ScheduledTaskPrincipal{param($UserId,$LogonType,$RunLevel);[pscustomobject]@{}}
  function Register-ScheduledTask{param($TaskName,$Action,$Trigger,$Settings,$Principal,$Description,[switch]$Force,$Xml);if($Xml){$script:registeredXml=$Xml}else{$script:mockTask=[pscustomobject]@{TaskName=$TaskName}}}
  function Unregister-ScheduledTask{param($TaskName,[switch]$Confirm,$ErrorAction);$script:unregistered=$true;$script:mockTask=$null}
  $state=Save-GrMetroLaunchIntegrationState $install $desktop $startMenu
  $paths=Set-GrMetroLaunchIntegration $install $true $desktop $startMenu
  foreach($path in @($paths.DesktopShortcut,$paths.StartMenuShortcut)){$lnk=$shell.CreateShortcut($path);Assert ($lnk.TargetPath-eq$hostExe) 'Migrated shortcut does not target the exact Update Host.';Assert ($lnk.Arguments-eq'-Mode Launch') 'Migrated shortcut omitted recovery-first Launch mode.';Assert ($lnk.WorkingDirectory-eq$hostRoot) 'Migrated shortcut working directory is incorrect.'}
  Assert ($script:registeredAction.Execute-eq$hostExe-and$script:registeredAction.Argument-eq'-Mode Launch'-and$script:registeredAction.WorkingDirectory-eq$hostRoot) 'Scheduled task does not target the exact Update Host Launch path.'
  Restore-GrMetroLaunchIntegration $state
  Assert ((Get-FileHash $oldDesktop -Algorithm SHA256).Hash-eq$desktopHash-and(Get-FileHash $oldStart -Algorithm SHA256).Hash-eq$startHash) 'Launch rollback did not restore exact previous shortcuts.'
  Assert ($script:registeredXml-eq'<Task>OLD TASK</Task>') 'Launch rollback did not restore the previous scheduled task XML.'
  Write-Output 'PASS: Desktop, Start Menu, and scheduled startup migrate to exact recovery-first Update Host paths and roll back exactly.'

  $script:mockTask=[pscustomobject]@{TaskName=$script:GrMetroAutostartTaskName};$script:unregistered=$false;$null=Set-GrMetroLaunchIntegration $install $false $desktop $startMenu;Assert $script:unregistered 'Disabled autostart choice did not remove the existing task.'
  $choice=Join-Path $install '.grmetro-autostart-choice';Write-Text $choice 'yes';$before=(Get-Content -LiteralPath $choice -Raw);$null=Set-GrMetroLaunchIntegration $install $true $desktop $startMenu;Assert ((Get-Content -LiteralPath $choice -Raw)-eq$before) 'Launch migration rewrote the persisted autostart choice.'
  Write-Output 'PASS: autostart migration preserves the saved choice and never creates duplicate task names.'

  foreach($unsafe in @('../Update Host/GRMetro Update Host.exe','../Update State/trust-state.json','release-public-keys.json','release-source.json')){Expect-Failure {Assert-GrMetroPackagePath $unsafe} "Application package admitted updater-owned path: $unsafe"}
  $updateHostSource=Get-Content -LiteralPath (Join-Path $repository 'scripts/windows/update-host.ps1')-Raw;Assert ($updateHostSource.IndexOf('Invoke-GrMetroPendingRecovery')-lt$updateHostSource.IndexOf("if(`$Mode -eq 'Launch')")) 'Update Host does not recover before Launch.';Assert ($updateHostSource-notmatch'launch-edge|msedge|Edge Profile') 'Update Host recovery launches or modifies Edge.'
  Write-Output 'PASS: routine packages cannot replace updater trust/host state and recovery precedes launch without Edge behavior.'

  $unsigned=Join-Path $fixture 'unsigned.exe';Write-Text $unsigned 'not signed';$status=Invoke-GrMetroAuthenticodeSigning -Files @($unsigned);Assert ($status.Status-eq'Unsigned development build') 'Unsigned development build was not labeled.';Expect-Failure {Invoke-GrMetroAuthenticodeSigning -Files @($unsigned) -RequireAuthenticode} 'Required production Authenticode accepted an unsigned executable.'
  $buildSource=Get-Content -LiteralPath (Join-Path $repository 'scripts/windows/build-installer.ps1')-Raw;foreach($name in @('GRMetro Performance Center.exe','GRMetro Update Host.exe','GRMetro Performance Center Setup.exe')){Assert ($buildSource-match[regex]::Escape($name)) "Build does not expose Authenticode integration for $name"}
  Write-Output 'PASS: unsigned candidates are labeled and required production Authenticode fails closed without an external certificate.'

  $rsa=New-Object Security.Cryptography.RSACryptoServiceProvider 3072;$rsa.PersistKeyInCsp=$false;$private=Join-Path $fixture 'external/private.xml';$public=Join-Path $fixture 'external/public.json';Write-Text $private ($rsa.ToXmlString($true));$publicXml=$rsa.ToXmlString($false);$publicDoc=[ordered]@{schemaVersion=1;keys=@([ordered]@{keyId='phase3-test';algorithm='RSA-SHA256';publicKeyXml=$publicXml;fingerprintSha256=(Get-GrMetroPublicKeyFingerprint $publicXml);allowedChannels=@('stable');testOnly=$false})};Write-Text $public ($publicDoc|ConvertTo-Json -Depth 5);$rsa.Dispose()
  $verifyOutput=& powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $repository 'scripts/windows/provision-release-signing-key.ps1') -Action VerifyPair -KeyId phase3-test -PrivateKeyPath $private -PublicKeyPath $public;if($LASTEXITCODE-ne0){throw 'Release key pair verification tool failed.'};Assert (($verifyOutput|Out-String)-match'Fingerprint') 'Release key verification omitted its public fingerprint.'
  Write-Output 'PASS: external release key tooling verifies matching material and reports an independent public fingerprint without generating a production key.'

  $bundle=Join-Path $fixture 'provision bundle';New-Item -ItemType Directory -Force -Path $bundle|Out-Null
  foreach($name in @('GRMetro Update Host.exe','update-host.ps1','package-files.ps1','process-control.ps1','application-validation.ps1','release-identity.ps1','authenticode-signing.ps1')){Write-Text (Join-Path $bundle $name) ('HOST '+$name)}
  Copy-Item (Join-Path $repository 'scripts/windows/release-feed.ps1') (Join-Path $bundle 'release-feed.ps1')
  $source=[ordered]@{schemaVersion=1;enabled=$true;metadataUrl='https://updates.test.invalid/release.json';signatureUrl='https://updates.test.invalid/release.json.sig';channel='stable';allowedHosts=@('updates.test.invalid');connectionTimeoutSeconds=10;responseTimeoutSeconds=30;maximumMetadataBytes=262144;maximumArtifactBytes=268435456;maximumRedirects=3};Write-Text (Join-Path $bundle 'release-source.default.json') ($source|ConvertTo-Json -Depth 4);Copy-Item $public (Join-Path $bundle 'release-public-keys.json');Write-Text (Join-Path $bundle 'provisioning-policy.json') '{"schemaVersion":1,"applyOnSetup":true,"updaterProtocol":1}'
  $stateConfig=Join-Path $env:LOCALAPPDATA 'GRMetro\Update State\release-source.json';Write-Text $stateConfig '{"schemaVersion":1,"enabled":false}'
  Add-Type -AssemblyName System.IO.Compression.FileSystem;$bundleZip=Join-Path $fixture 'provision.zip';[IO.Compression.ZipFile]::CreateFromDirectory($bundle,$bundleZip)
  $hostState=Install-GrMetroStableUpdateHost $bundleZip;Assert ((Get-Content -LiteralPath $stateConfig -Raw)-match'updates.test.invalid') 'Explicit migration provisioning did not install release-source policy.';Restore-GrMetroStableUpdateHost $hostState;Assert ((Get-Content -LiteralPath $stateConfig -Raw)-eq'{"schemaVersion":1,"enabled":false}') 'Failed migration did not restore previous release-source policy.'
  Copy-Item -LiteralPath $public -Destination (Join-Path $hostRoot 'release-public-keys.json') -Force
  $repairBundle=Join-Path $fixture 'repair bundle';Copy-Item -LiteralPath $bundle -Destination $repairBundle -Recurse;Write-Text (Join-Path $repairBundle 'release-source.default.json') '{"schemaVersion":1,"enabled":false,"metadataUrl":"","signatureUrl":"","channel":"stable","allowedHosts":[],"connectionTimeoutSeconds":10,"responseTimeoutSeconds":30,"maximumMetadataBytes":262144,"maximumArtifactBytes":268435456,"maximumRedirects":3}';Write-Text (Join-Path $repairBundle 'release-public-keys.json') '{"schemaVersion":1,"keys":[]}';Write-Text (Join-Path $repairBundle 'provisioning-policy.json') '{"schemaVersion":1,"applyOnSetup":false,"updaterProtocol":1}';$repairZip=Join-Path $fixture 'repair.zip';[IO.Compression.ZipFile]::CreateFromDirectory($repairBundle,$repairZip);$repairState=Install-GrMetroStableUpdateHost $repairZip;Assert ((Get-Content -LiteralPath (Join-Path $repairState.Destination 'release-public-keys.json')-Raw)-match'phase3-test') 'Unprovisioned repair Setup erased existing trusted public keys.';Restore-GrMetroStableUpdateHost $repairState
  $badBundle=Join-Path $fixture 'bad provision bundle';Copy-Item -LiteralPath $bundle -Destination $badBundle -Recurse;Write-Text (Join-Path $badBundle 'release-public-keys.json') '{"schemaVersion":1,"keys":[]}'
  $badZip=Join-Path $fixture 'bad-provision.zip';[IO.Compression.ZipFile]::CreateFromDirectory($badBundle,$badZip);Expect-Failure {Install-GrMetroStableUpdateHost $badZip} 'Malformed/empty production key provisioning was accepted.'
  $badSourceBundle=Join-Path $fixture 'bad source bundle';Copy-Item -LiteralPath $bundle -Destination $badSourceBundle -Recurse;Write-Text (Join-Path $badSourceBundle 'release-source.default.json') '{"schemaVersion":1,"enabled":true,"metadataUrl":"http://updates.test.invalid/release.json","signatureUrl":"http://updates.test.invalid/release.json.sig","channel":"stable","allowedHosts":["updates.test.invalid"],"connectionTimeoutSeconds":10,"responseTimeoutSeconds":30,"maximumMetadataBytes":262144,"maximumArtifactBytes":268435456,"maximumRedirects":3}';$badSourceZip=Join-Path $fixture 'bad-source.zip';[IO.Compression.ZipFile]::CreateFromDirectory($badSourceBundle,$badSourceZip);Expect-Failure {Install-GrMetroStableUpdateHost $badSourceZip} 'Malformed/non-HTTPS release-source provisioning was accepted.'
  $testOnlyBundle=Join-Path $fixture 'test-only provision bundle';Copy-Item -LiteralPath $bundle -Destination $testOnlyBundle -Recurse;$testDoc=Get-Content -LiteralPath (Join-Path $testOnlyBundle 'release-public-keys.json')-Raw|ConvertFrom-Json;$testDoc.keys[0].testOnly=$true;Write-Text (Join-Path $testOnlyBundle 'release-public-keys.json') ($testDoc|ConvertTo-Json -Depth 5);$testZip=Join-Path $fixture 'test-only.zip';[IO.Compression.ZipFile]::CreateFromDirectory($testOnlyBundle,$testZip);Expect-Failure {Install-GrMetroStableUpdateHost $testZip} 'Test-only key entered production provisioning.'
  Write-Output 'PASS: explicit Setup provisioning is validated, replaces only authorized trust policy, and rolls back previous policy on failure.'
}finally{
  Remove-Item Function:\Get-ScheduledTask,Function:\Export-ScheduledTask,Function:\New-ScheduledTaskAction,Function:\New-ScheduledTaskTrigger,Function:\New-ScheduledTaskSettingsSet,Function:\New-ScheduledTaskPrincipal,Function:\Register-ScheduledTask,Function:\Unregister-ScheduledTask -Force -ErrorAction SilentlyContinue
  $env:LOCALAPPDATA=$savedLocal;$env:APPDATA=$savedApp
  $cleanup=[IO.Path]::GetFullPath($fixture);$temp=[IO.Path]::GetFullPath([IO.Path]::GetTempPath()).TrimEnd('\');if([IO.Path]::GetDirectoryName($cleanup)-ne$temp-or[IO.Path]::GetFileName($cleanup)-notlike'grmetro updater phase3 *'){throw 'Unsafe Phase 3 fixture cleanup path.'};if(Test-Path -LiteralPath $cleanup){Remove-Item -LiteralPath $cleanup -Recurse -Force}
}
