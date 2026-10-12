$ErrorActionPreference='Stop'
$repository=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..')).TrimEnd('\')
. (Join-Path $repository 'scripts\windows\package-files.ps1')
. (Join-Path $repository 'scripts\windows\release-identity.ps1')
. (Join-Path $repository 'scripts\windows\release-feed.ps1')
function Assert($condition,[string]$message){if(-not$condition){throw $message}}
function Expect-Failure([scriptblock]$action,[string]$message){$failed=$false;try{&$action}catch{$failed=$true};Assert $failed $message}
function Write-Bytes([string]$path,[byte[]]$bytes){New-Item -ItemType Directory -Force -Path ([IO.Path]::GetDirectoryName($path))|Out-Null;[IO.File]::WriteAllBytes($path,$bytes)}
function Write-Text([string]$path,[string]$text){Write-Bytes $path ((New-Object Text.UTF8Encoding $false).GetBytes($text))}

$fixture=Join-Path ([IO.Path]::GetTempPath()) ('grmetro updater phase2 '+[guid]::NewGuid())
$serverRoot=Join-Path $fixture 'server';$stateRoot=Join-Path $fixture 'Update State';$installRoot=Join-Path $fixture 'installed/Performance Center';$hostOut=Join-Path $fixture 'external Update Host'
$manifestPath='scripts/windows/package-manifest.json'
$packageFiles=@('package.json','package-lock.json','.env.example','README.md','apps/backend/src/index.js','GRMetro Performance Center.exe','scripts/windows/package-manifest.json','scripts/windows/package-build.json','scripts/windows/package-files.ps1','scripts/windows/process-control.ps1','scripts/windows/launch-integration.ps1','scripts/windows/release-identity.ps1','scripts/windows/application-validation.ps1','scripts/windows/env-wizard.ps1')
$privatePaths=@('.env','.grmetro-autostart-choice','.grmetro-firewall-choice','data/company-config.json','data/goals.json','data/display-settings.json','data/management-dismissals.json','logs/supervisor.log','apps/backend/data/spreadsheet-slide.json')
function New-Package([string]$Root,[string]$Version,[string]$Prefix){
  foreach($relative in $packageFiles){if($relative-notin@($manifestPath,'scripts/windows/package-build.json')){Write-Text (Join-Path $Root $relative) "$Prefix $relative"}}
  $manifest=[ordered]@{version=1;files=@($packageFiles|Sort-Object)};Write-Text (Join-Path $Root $manifestPath) (($manifest|ConvertTo-Json -Depth 4)+"`n")
  $build=New-GrMetroReleaseMetadata -ReleaseVersion $Version -Channel stable -Commit $Prefix -SourceState committed -BuiltAt '2026-10-07T12:00:00Z' -UpdaterProtocol 1 -NodeVersion 'v24.18.1';Write-Text (Join-Path $Root 'scripts/windows/package-build.json') (($build|ConvertTo-Json -Depth 4)+"`n")
}
function Install-Baseline([string]$Root,[string]$Version){$source=Join-Path $fixture ('baseline-'+$Version);New-Package $source $Version 'OLD';foreach($relative in $packageFiles){$target=Join-Path $Root $relative;New-Item -ItemType Directory -Force -Path ([IO.Path]::GetDirectoryName($target))|Out-Null;Copy-Item -LiteralPath (Join-Path $source $relative) -Destination $target -Force};foreach($relative in $privatePaths){Write-Text (Join-Path $Root $relative) ('PRIVATE '+$relative)}}
function New-Metadata([string]$Version,[string]$ArtifactUrl,[Int64]$Size,[string]$Hash,[string]$Channel='stable',[int]$Protocol=1,[string]$KeyId='phase2-test'){$id=ConvertTo-GrMetroReleaseVersion $Version;return [ordered]@{schemaVersion=1;releaseVersion=$id.ReleaseVersion;releaseSequence=$id.ReleaseSequence;channel=$Channel;artifactUrl=$ArtifactUrl;artifactSize=$Size;artifactSha256=$Hash;minimumUpdaterProtocol=$Protocol;publishedAt='2026-10-07T12:00:00Z';releaseNotes=@('Safe updater test release','<Button Command="evil">must stay plain text</Button>');keyId=$KeyId}}
function Write-Signed($Metadata,[string]$MetadataPath,[string]$SignaturePath,$Rsa){$bytes=(New-Object Text.UTF8Encoding $false).GetBytes(($Metadata|ConvertTo-Json -Compress -Depth 6));Write-Bytes $MetadataPath $bytes;$signature=$Rsa.SignData($bytes,[Security.Cryptography.CryptoConfig]::MapNameToOID('SHA256'));$document=[ordered]@{schemaVersion=1;keyId=[string]$Metadata.keyId;algorithm='RSA-SHA256';signature=[Convert]::ToBase64String($signature)};Write-Text $SignaturePath ($document|ConvertTo-Json -Compress)}
function New-Source([string]$MetadataUrl,[string]$SignatureUrl,[Int64]$MetadataLimit=262144,[Int64]$ArtifactLimit=268435456,[string[]]$Hosts=@('127.0.0.1')){$path=Join-Path $fixture ('source-'+[guid]::NewGuid().ToString('N')+'.json');$source=[ordered]@{schemaVersion=1;enabled=$true;metadataUrl=$MetadataUrl;signatureUrl=$SignatureUrl;channel='stable';allowedHosts=$Hosts;connectionTimeoutSeconds=2;responseTimeoutSeconds=8;maximumMetadataBytes=$MetadataLimit;maximumArtifactBytes=$ArtifactLimit;maximumRedirects=2};Write-Text $path ($source|ConvertTo-Json -Depth 4);return $path}
function Check([string]$SourcePath,[string]$State=$stateRoot){Get-GrMetroReleaseCheck -InstallRoot $installRoot -StateRoot $State -ReleaseSourcePath $SourcePath -PublicKeysPath $keysPath -UpdaterProtocol 1 -AllowInsecureTestTransport -AllowTestRoot}

$server=$null;$rsa=$null
try{
  New-Item -ItemType Directory -Force -Path $serverRoot,$stateRoot,$installRoot|Out-Null
  Install-Baseline $installRoot '2026.10.7.1'
  $rsa=New-Object Security.Cryptography.RSACryptoServiceProvider 3072;$rsa.PersistKeyInCsp=$false
  $privateKeyPath=Join-Path $fixture 'external signing key.xml';Write-Text $privateKeyPath ($rsa.ToXmlString($true))
  $keysPath=Join-Path $fixture 'pinned-keys.json';$keys=[ordered]@{schemaVersion=1;keys=@([ordered]@{keyId='phase2-test';algorithm='RSA-SHA256';publicKeyXml=$rsa.ToXmlString($false);allowedChannels=@('stable');testOnly=$false})};Write-Text $keysPath ($keys|ConvertTo-Json -Depth 5)
  $testOnlyKeys=Join-Path $fixture 'test-only-keys.json';$testOnly=[ordered]@{schemaVersion=1;keys=@([ordered]@{keyId='test-only';algorithm='RSA-SHA256';publicKeyXml=$rsa.ToXmlString($false);allowedChannels=@('testing');testOnly=$true})};Write-Text $testOnlyKeys ($testOnly|ConvertTo-Json -Depth 5);Expect-Failure {Get-GrMetroPinnedReleaseKeys $testOnlyKeys} 'Production accepted a test-only public key.'
  $newSource=Join-Path $fixture 'new package';New-Package $newSource '2026.10.7.2' 'NEW';Add-Type -AssemblyName System.IO.Compression.FileSystem
  $packageZip=Join-Path $serverRoot 'package.zip';[IO.Compression.ZipFile]::CreateFromDirectory($newSource,$packageZip)
  $artifactSize=(Get-Item $packageZip).Length;$artifactHash=(Get-FileHash $packageZip -Algorithm SHA256).Hash
  $cloudflareSource=Read-GrMetroReleaseSource (Join-Path $repository 'scripts/windows/release-source.cloudflare-staging.json');$cloudflareMetadata=New-Metadata '2026.10.7.2' 'https://grmetro-updates.grmetroheatingandcooling.workers.dev/staging/grmetro-performance-center-2026.10.7.2.zip' $artifactSize $artifactHash -Channel testing;$cloudflareBytes=(New-Object Text.UTF8Encoding $false).GetBytes(($cloudflareMetadata|ConvertTo-Json -Compress -Depth 6));$cloudflareSignature=$rsa.SignData($cloudflareBytes,[Security.Cryptography.CryptoConfig]::MapNameToOID('SHA256'));Assert (Test-GrMetroReleaseSignature $cloudflareBytes $cloudflareSignature ($rsa.ToXmlString($false))) 'Cloudflare-shaped staging metadata signature did not verify.';$cloudflareTestingKeys=@{'phase2-test'=[pscustomobject]@{PublicKeyXml=$rsa.ToXmlString($false);AllowedChannels=@('testing');TestOnly=$false}};$verifiedCloudflare=ConvertFrom-GrMetroSignedReleaseMetadata $cloudflareBytes ((New-Object Text.UTF8Encoding $false).GetBytes((([ordered]@{schemaVersion=1;keyId='phase2-test';algorithm='RSA-SHA256';signature=[Convert]::ToBase64String($cloudflareSignature)}|ConvertTo-Json -Compress)))) $cloudflareTestingKeys;$cloudflareTrusted=Test-GrMetroTrustedReleaseMetadata $verifiedCloudflare $cloudflareSource ([pscustomobject]@{releaseVersion='2026.10.7.1';releaseSequence=202610070001;channel='testing'}) ([pscustomobject]@{highestTrustedSequence=0;identities=[pscustomobject]@{}});Assert ($cloudflareTrusted.Available-and$cloudflareTrusted.ArtifactUri.AbsolutePath-like'/staging/*') 'Cloudflare staging metadata did not pass trusted path/channel validation.'
  $stableMetadata=([ordered]@{}+$cloudflareMetadata);$stableMetadata.channel='stable';$stableBytes=(New-Object Text.UTF8Encoding $false).GetBytes(($stableMetadata|ConvertTo-Json -Compress -Depth 6));$stableSignature=$rsa.SignData($stableBytes,[Security.Cryptography.CryptoConfig]::MapNameToOID('SHA256'));$stableDocument=(New-Object Text.UTF8Encoding $false).GetBytes((([ordered]@{schemaVersion=1;keyId='phase2-test';algorithm='RSA-SHA256';signature=[Convert]::ToBase64String($stableSignature)}|ConvertTo-Json -Compress)));Expect-Failure {ConvertFrom-GrMetroSignedReleaseMetadata $stableBytes $stableDocument $cloudflareTestingKeys} 'Testing-scoped staging key authorized stable production metadata.'
  Write-Output 'PASS: real Cloudflare staging origin accepts correctly signed testing-channel metadata and immutable ZIP naming.'
  $listener=New-Object Net.Sockets.TcpListener([Net.IPAddress]::Loopback,0);$listener.Start();$port=([Net.IPEndPoint]$listener.LocalEndpoint).Port;$listener.Stop();$base="http://127.0.0.1:$port"
  $metadataPath=Join-Path $serverRoot 'release.json';$signaturePath=Join-Path $serverRoot 'release.json.sig';$metadata=New-Metadata '2026.10.7.2' "$base/package.zip" $artifactSize $artifactHash;Write-Signed $metadata $metadataPath $signaturePath $rsa
  $sourcePath=New-Source "$base/release.json" "$base/release.json.sig"
  $server=Start-Process powershell.exe -ArgumentList @('-NoProfile','-ExecutionPolicy','Bypass','-File',('"{0}"'-f(Join-Path $repository 'tests/windows-release-fixture-server.ps1')),'-Root',('"{0}"'-f$serverRoot),'-Port',[string]$port) -PassThru -WindowStyle Hidden
  $deadline=(Get-Date).AddSeconds(10);do{Start-Sleep -Milliseconds 100;try{$ready=Invoke-WebRequest -UseBasicParsing "$base/not-found" -TimeoutSec 1 -ErrorAction Stop}catch{$ready=$_.Exception.Response}}while(-not$ready-and(Get-Date)-lt$deadline)

  $result=Check $sourcePath
  Assert ($result.status-eq'available'-and$result.latest-eq'2026.10.7.2') 'Valid signed metadata was not accepted.'
  Assert ((Get-Content -LiteralPath (Join-Path $stateRoot 'trust-state.json')-Raw)-match'202610070002') 'Highest trusted sequence was not persisted.'
  Assert ((Get-Content -LiteralPath (Join-Path $installRoot 'README.md')-Raw)-like'OLD*') 'Update check mutated the application.'
  Write-Output 'PASS: exact-byte RSA-SHA256 metadata verification accepts the configured key and persists replay state.'

  $originalMetadata=[IO.File]::ReadAllBytes($metadataPath);$originalSignature=[IO.File]::ReadAllBytes($signaturePath)
  Write-Bytes $metadataPath ($originalMetadata+([byte[]](32)))
  Expect-Failure {Check $sourcePath (Join-Path $fixture 'tampered metadata state')} 'Tampered metadata was accepted.'
  Write-Bytes $metadataPath $originalMetadata;$tamperedSignature=(New-Object Text.UTF8Encoding($false,$true)).GetString($originalSignature)|ConvertFrom-Json;$tamperedSignature.signature=[Convert]::ToBase64String((New-Object byte[] 384));Write-Text $signaturePath ($tamperedSignature|ConvertTo-Json -Compress)
  Expect-Failure {Check $sourcePath (Join-Path $fixture 'tampered signature state')} 'Tampered signature was accepted.'
  Write-Bytes $signaturePath $originalSignature
  $unknown=New-Metadata '2026.10.7.2' "$base/package.zip" $artifactSize $artifactHash -KeyId 'unknown';Write-Signed $unknown $metadataPath $signaturePath $rsa
  Expect-Failure {Check $sourcePath (Join-Path $fixture 'unknown key state')} 'Unknown key ID was accepted.'
  Write-Text $metadataPath '{broken';Write-Bytes $signaturePath $originalSignature
  Expect-Failure {Check $sourcePath (Join-Path $fixture 'malformed state')} 'Malformed metadata was accepted.'
  Write-Signed $metadata $metadataPath $signaturePath $rsa
  Write-Output 'PASS: tampered metadata/signature, unknown key, and malformed metadata fail before application mutation.'

  foreach($case in @(
    @{Name='wrong schema';Metadata=([ordered]@{}+$metadata);Change={param($m)$m.schemaVersion=9}},
    @{Name='invalid CalVer';Metadata=([ordered]@{}+$metadata);Change={param($m)$m.releaseVersion='2026.2.30.1'}},
    @{Name='wrong channel';Metadata=([ordered]@{}+$metadata);Change={param($m)$m.channel='testing'}},
    @{Name='development';Metadata=([ordered]@{}+$metadata);Change={param($m)$m.releaseVersion='0.0.0.0';$m.releaseSequence=0}}
  )){$m=$case.Metadata;&$case.Change $m;Write-Signed $m $metadataPath $signaturePath $rsa;Expect-Failure {Check $sourcePath (Join-Path $fixture ($case.Name+' state'))} "$($case.Name) metadata was accepted."}
  Write-Signed $metadata $metadataPath $signaturePath $rsa
  $requiresSetup=([ordered]@{}+$metadata);$requiresSetup.minimumUpdaterProtocol=2;Write-Signed $requiresSetup $metadataPath $signaturePath $rsa;$protocolResult=Check $sourcePath (Join-Path $fixture 'protocol state');Assert ($protocolResult.status-eq'requires-setup'-and-not$protocolResult.updateAvailable) 'Incompatible updater protocol was not routed to Setup.'
  Write-Signed $metadata $metadataPath $signaturePath $rsa
  Write-Output 'PASS: schema, CalVer, channel, development identity, and updater protocol policies fail closed.'

  $same=New-Metadata '2026.10.7.1' "$base/package.zip" $artifactSize $artifactHash;Write-Signed $same $metadataPath $signaturePath $rsa;$sameResult=Check $sourcePath (Join-Path $fixture 'same state');Assert (-not$sameResult.updateAvailable) 'Same version was offered.'
  $lower=New-Metadata '2026.10.6.9' "$base/package.zip" $artifactSize $artifactHash;Write-Signed $lower $metadataPath $signaturePath $rsa;$lowerResult=Check $sourcePath (Join-Path $fixture 'lower state');Assert (-not$lowerResult.updateAvailable) 'Lower version was offered.'
  Write-Signed $metadata $metadataPath $signaturePath $rsa;$replayState=Join-Path $fixture 'replay state';$null=Check $sourcePath $replayState
  $older=New-Metadata '2026.10.7.1' "$base/package.zip" $artifactSize $artifactHash;Write-Signed $older $metadataPath $signaturePath $rsa;Expect-Failure {Check $sourcePath $replayState} 'Older signed sequence was accepted after a newer trusted sequence.'
  Write-Signed $metadata $metadataPath $signaturePath $rsa;$reuseState=Join-Path $fixture 'reuse state';$null=Check $sourcePath $reuseState;$changed=([ordered]@{}+$metadata);$changed.artifactSha256=('A'*64);Write-Signed $changed $metadataPath $signaturePath $rsa;Expect-Failure {Check $sourcePath $reuseState} 'Reused release identity with changed digest was accepted.'
  Write-Signed $metadata $metadataPath $signaturePath $rsa
  Write-Output 'PASS: same, downgrade, replayed sequence, and reused identity protections are enforced.'

  Expect-Failure {Assert-GrMetroReleaseUri 'http://updates.example/release.json' @('updates.example')} 'Production HTTP was accepted.'
  Expect-Failure {Assert-GrMetroReleaseUri 'file:///C:/release.json' @('updates.example')} 'file URL was accepted.'
  Expect-Failure {Assert-GrMetroReleaseUri '\\server\share\release.json' @('server')} 'UNC path was accepted.'
  Expect-Failure {Assert-GrMetroReleaseUri 'https://user:password@updates.example/release.json' @('updates.example')} 'URL-embedded credentials were accepted.'
  Expect-Failure {Assert-GrMetroReleaseUri 'https://evil.example/release.json' @('updates.example')} 'Unapproved HTTPS host was accepted.'
  $redirectSource=New-Source "$base/redirect-unapproved" "$base/release.json.sig";Expect-Failure {Check $redirectSource (Join-Path $fixture 'redirect state')} 'Redirect to unapproved host was accepted.'
  $notFoundSource=New-Source "$base/not-found" "$base/release.json.sig";Expect-Failure {Check $notFoundSource (Join-Path $fixture '404 state')} 'HTTP 404 was accepted.'
  $offlineSource=New-Source 'http://127.0.0.1:1/release.json' 'http://127.0.0.1:1/release.json.sig';Expect-Failure {Check $offlineSource (Join-Path $fixture 'offline state')} 'Connection failure was accepted.'
  Write-Output 'PASS: scheme, credential/path, host, redirect, HTTP status, and connection failures are bounded and rejected.'

  Write-Text (Join-Path $serverRoot 'oversized.json') ('x'*2048);$oversizedSource=New-Source "$base/oversized.json" "$base/release.json.sig" 1024;Expect-Failure {Check $oversizedSource (Join-Path $fixture 'oversized metadata state')} 'Oversized metadata was accepted.'
  Copy-Item $metadataPath (Join-Path $serverRoot 'truncated.bin') -Force;$truncatedSource=New-Source "$base/truncated.bin" "$base/release.json.sig";Expect-Failure {Check $truncatedSource (Join-Path $fixture 'truncated metadata state')} 'Truncated metadata was accepted.'
  Write-Output 'PASS: metadata size and truncation limits are enforced.'

  $verified=Check $sourcePath (Join-Path $fixture 'download state');$download=Receive-GrMetroVerifiedReleasePackage $verified (Join-Path $fixture 'download state') -AllowInsecureTestTransport -AllowTestRoot
  Assert ((Get-FileHash $download -Algorithm SHA256).Hash-eq$artifactHash) 'Verified artifact download hash changed.'
  Assert (-not(Test-Path -LiteralPath ($download+'.partial'))) 'Successful download left a partial file.'
  $abandonedRoot=Join-Path $fixture 'abandoned state';$abandonedCache=Join-Path $abandonedRoot 'Cache';New-Item -ItemType Directory -Force -Path $abandonedCache|Out-Null;$oldPartial=Join-Path $abandonedCache 'old.partial';$recentPartial=Join-Path $abandonedCache 'recent.partial';Write-Text $oldPartial 'old';Write-Text $recentPartial 'recent';(Get-Item $oldPartial).LastWriteTimeUtc=[DateTime]::UtcNow.AddDays(-2);Remove-GrMetroAbandonedUpdaterFiles $abandonedRoot -AllowTestRoot;Assert (-not(Test-Path $oldPartial)) 'Abandoned partial download was not cleaned.';Assert (Test-Path $recentPartial) 'Recent partial download was removed prematurely.'
  $badHash=$verified.PSObject.Copy();$badHash.artifactSha256='B'*64;Expect-Failure {Receive-GrMetroVerifiedReleasePackage $badHash (Join-Path $fixture 'bad hash state') -AllowInsecureTestTransport -AllowTestRoot} 'SHA mismatch was accepted.'
  Assert (-not@(Get-ChildItem -LiteralPath (Join-Path $fixture 'bad hash state') -Recurse -Filter '*.partial' -ErrorAction SilentlyContinue)) 'Failed hash left a partial file.'
  $badSize=$verified.PSObject.Copy();$badSize.artifactSize=[Int64]$artifactSize+1;Expect-Failure {Receive-GrMetroVerifiedReleasePackage $badSize (Join-Path $fixture 'bad size state') -AllowInsecureTestTransport -AllowTestRoot} 'Incorrect expected size was accepted.'
  Copy-Item -LiteralPath $packageZip -Destination (Join-Path $serverRoot 'truncated.bin') -Force;$truncatedArtifact=$verified.PSObject.Copy();$truncatedArtifact.artifactUrl="$base/truncated.bin";$truncatedArtifact.artifactSize=[Int64]$artifactSize+25;Expect-Failure {Receive-GrMetroVerifiedReleasePackage $truncatedArtifact (Join-Path $fixture 'truncated artifact state') -AllowInsecureTestTransport -AllowTestRoot} 'Interrupted artifact download was accepted.'
  Assert (-not@(Get-ChildItem -LiteralPath (Join-Path $fixture 'truncated artifact state') -Recurse -Filter '*.partial' -ErrorAction SilentlyContinue)) 'Interrupted artifact download left a partial file.'
  $oversizedArtifact=$verified.PSObject.Copy();$oversizedArtifact.source.MaximumArtifactBytes=100;Expect-Failure {Receive-GrMetroVerifiedReleasePackage $oversizedArtifact (Join-Path $fixture 'oversized artifact state') -AllowInsecureTestTransport -AllowTestRoot} 'Oversized artifact was accepted.'
  Write-Output 'PASS: verified download, exact size/hash, configured maximum, and partial cleanup policies pass.'

  $null=Test-GrMetroPackageArchive $download $installRoot
  Write-Text (Join-Path $serverRoot 'corrupt.zip') 'not a zip';Expect-Failure {Test-GrMetroPackageArchive (Join-Path $serverRoot 'corrupt.zip') $installRoot} 'Corrupt ZIP was accepted.'
  $invalidRoot=Join-Path $fixture 'invalid package';New-Package $invalidRoot '2026.10.7.3' 'BAD';Remove-Item -LiteralPath (Join-Path $invalidRoot 'apps/backend/src/index.js') -Force;$invalidZip=Join-Path $serverRoot 'invalid.zip';[IO.Compression.ZipFile]::CreateFromDirectory($invalidRoot,$invalidZip);Expect-Failure {Test-GrMetroPackageArchive $invalidZip $installRoot} 'Invalid package inventory was accepted.'
  $traversalZip=Join-Path $serverRoot 'traversal.zip';$archive=[IO.Compression.ZipFile]::Open($traversalZip,[IO.Compression.ZipArchiveMode]::Create);try{$entry=$archive.CreateEntry('../escape.txt');$writer=New-Object IO.StreamWriter($entry.Open());$writer.Write('escape');$writer.Dispose()}finally{$archive.Dispose()};Expect-Failure {Test-GrMetroPackageArchive $traversalZip $installRoot} 'Traversal ZIP was accepted.'
  Write-Output 'PASS: corrupt ZIP, invalid manifest inventory, and traversal entries fail package validation.'

  & powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $repository 'scripts/windows/build-update-host.ps1') -OutputDirectory $hostOut|Out-Null;if($LASTEXITCODE-ne0){throw 'Disposable Update Host build failed.'}
  $hostSourceConfig=Join-Path $hostOut 'release-source.test.json';Copy-Item $sourcePath $hostSourceConfig
  $hostKeys=Join-Path $hostOut 'release-public-keys.test.json';Copy-Item $keysPath $hostKeys
  $handoffRoot=Join-Path $fixture 'handoff installed/Performance Center';Install-Baseline $handoffRoot '2026.10.7.1';$handoffState=Join-Path $fixture 'handoff state';$statusPath=Join-Path $handoffState 'operation.json'
  $edgeProfile=Join-Path $fixture 'GRMetro/Edge Profile/sentinel.txt';$remoteProfile=Join-Path $fixture 'GRMetro/Remote App Profile/sentinel.txt';Write-Text $edgeProfile 'EDGE PROFILE';Write-Text $remoteProfile 'REMOTE PROFILE'
  $parent=Start-Process powershell.exe -ArgumentList @('-NoProfile','-Command','Start-Sleep -Seconds 2') -PassThru -WindowStyle Hidden
  $env:GRMETRO_UPDATER_TEST_MODE='true'
  $hostProcess=Start-Process -FilePath (Join-Path $hostOut 'GRMetro Update Host.exe') -ArgumentList @('-Mode','PrepareRemote','-InstallRoot',('"{0}"'-f$handoffRoot),'-StateRoot',('"{0}"'-f$handoffState),'-ReleaseSourcePath',('"{0}"'-f$hostSourceConfig),'-PublicKeysPath',('"{0}"'-f$hostKeys),'-StatusPath',('"{0}"'-f$statusPath),'-ParentProcessId',[string]$parent.Id,'-ExpectedReleaseVersion','2026.10.7.2','-AllowInsecureTestTransport','-AllowTestRoot','-Quiet','-SkipValidation','-NoLaunch') -PassThru
  Start-Sleep -Milliseconds 600;Assert ((Get-Content -LiteralPath (Join-Path $handoffRoot 'README.md')-Raw)-like'OLD*') 'Remote updater mutated application before Control Center handoff.'
  $hostProcess.WaitForExit(60000)|Out-Null;Assert ($hostProcess.HasExited-and$hostProcess.ExitCode-eq0) 'Verified remote package handoff failed.'
  Assert ((Get-Content -LiteralPath (Join-Path $handoffRoot 'README.md')-Raw)-like'NEW*') 'Verified remote package was not applied.'
  Assert (Test-Path -LiteralPath (Join-Path $handoffState 'trust-state.json')) 'Updater trust state did not survive application replacement.'
  foreach($relative in $privatePaths){Assert ((Get-Content -LiteralPath (Join-Path $handoffRoot $relative)-Raw)-eq('PRIVATE '+$relative)) "Remote update changed persistent data: $relative"}
  Assert ((Get-Content -LiteralPath $edgeProfile -Raw)-eq'EDGE PROFILE') 'Remote update touched the ServiceTitan Edge Profile.';Assert ((Get-Content -LiteralPath $remoteProfile -Raw)-eq'REMOTE PROFILE') 'Remote update touched the Remote App Profile.'
  Write-Output 'PASS: signed remote package prepares before handoff, applies through Phase 1, and preserves updater/private state.'

  $notesPath=Join-Path $fixture 'notes.txt';Write-Text $notesPath "Release summary`r`nSecond change"
  $releaseOutput=Join-Path $fixture 'release output';$env:GRMETRO_UPDATER_TEST_MODE='true'
  Expect-Failure {& powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $repository 'scripts/windows/create-windows-release.ps1') -Version '0.0.0.0' -Channel stable -ArtifactUrl "$base/x.zip" -SigningKeyPath $privateKeyPath -KeyId phase2-test -ReleaseNotesPath $notesPath -OutputRoot (Join-Path $fixture 'invalid version') -ArtifactZip $packageZip -SkipBuild -AllowDirtyTest -AllowInsecureTestUrl|Out-Null;if($LASTEXITCODE-ne0){throw 'invalid'}} 'Release tool accepted development identity 0.0.0.0.'
  $toolOutput=& powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $repository 'scripts/windows/create-windows-release.ps1') -Version '2026.10.7.2' -Channel stable -ArtifactUrl "$base/GRMetro-Performance-Center-2026.10.7.2.zip" -SigningKeyPath $privateKeyPath -KeyId 'phase2-test' -ReleaseNotesPath $notesPath -OutputRoot $releaseOutput -ArtifactZip $packageZip -SkipBuild -AllowDirtyTest -AllowInsecureTestUrl
  if($LASTEXITCODE-ne0){throw 'Local release creation tool failed.'};$toolResult=$toolOutput|Select-Object -Last 1|ConvertFrom-Json
  Assert (Test-Path -LiteralPath $toolResult.metadata) 'Release tool omitted release.json.';Assert (Test-Path -LiteralPath $toolResult.signature) 'Release tool omitted detached signature.'
  Assert ([IO.Path]::GetFileName([string]$toolResult.artifact)-eq'grmetro-performance-center-2026.10.7.2.zip') 'Release tool artifact name does not match the static Worker route convention.'
  $releaseDirectory=[string]$toolResult.releaseDirectory;$releaseText=@(Get-ChildItem -LiteralPath $releaseDirectory -File|Where-Object{$_.Extension-in@('.json','.txt')}|ForEach-Object{Get-Content -LiteralPath $_.FullName -Raw})-join"`n"
  Assert (-not$releaseText.Contains($rsa.ToXmlString($true))) 'Private signing key entered release output.';Assert (-not$releaseText.Contains($privateKeyPath)) 'Private signing key path entered release output.'
  Expect-Failure {& powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $repository 'scripts/windows/create-windows-release.ps1') -Version '2026.10.7.2' -Channel stable -ArtifactUrl "$base/x.zip" -SigningKeyPath $privateKeyPath -KeyId phase2-test -ReleaseNotesPath $notesPath -OutputRoot $releaseOutput -ArtifactZip $packageZip -SkipBuild -AllowDirtyTest -AllowInsecureTestUrl|Out-Null;if($LASTEXITCODE-ne0){throw 'reused'}} 'Release tool accepted a reused local identity.'
  $env:GRMETRO_UPDATER_TEST_MODE=$null
  Expect-Failure {& powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $repository 'scripts/windows/create-windows-release.ps1') -Version '2026.10.7.3' -Channel stable -ArtifactUrl 'https://updates.example/x.zip' -SigningKeyPath $privateKeyPath -KeyId phase2-test -ReleaseNotesPath $notesPath -OutputRoot (Join-Path $fixture 'dirty refusal')|Out-Null;if($LASTEXITCODE-ne0){throw 'dirty'}} 'Production release tool did not refuse the dirty source tree.'
  Write-Output 'PASS: local release tooling validates identity, refuses dirty/reused production output, signs, self-verifies, and excludes private key material.'
}finally{
  $env:GRMETRO_UPDATER_TEST_MODE=$null
  if($server-and-not$server.HasExited){try{Invoke-WebRequest -UseBasicParsing "http://127.0.0.1:$port/__stop" -TimeoutSec 2|Out-Null}catch{};try{$server.WaitForExit(3000)|Out-Null}catch{};if(-not$server.HasExited){Stop-Process -Id $server.Id -Force -ErrorAction SilentlyContinue}}
  if($rsa){$rsa.Dispose()}
  $cleanup=[IO.Path]::GetFullPath($fixture);$temp=[IO.Path]::GetFullPath([IO.Path]::GetTempPath()).TrimEnd('\');if([IO.Path]::GetDirectoryName($cleanup)-ne$temp-or[IO.Path]::GetFileName($cleanup)-notlike'grmetro updater phase2 *'){throw 'Unsafe Phase 2 fixture cleanup path.'}
  if(Test-Path -LiteralPath $cleanup){for($attempt=1;$attempt-le8;$attempt++){try{Remove-Item -LiteralPath $cleanup -Recurse -Force -ErrorAction Stop;break}catch{if($attempt-eq8){Write-Warning $_.Exception.Message}else{Start-Sleep -Milliseconds 250}}}}
}
