param(
  [Parameter(Mandatory=$true)][string]$MigrationVersion,
  [Parameter(Mandatory=$true)][string]$ReleaseSourceConfigPath,
  [Parameter(Mandatory=$true)][string]$ReleasePublicKeysPath,
  [Parameter(Mandatory=$true)][string]$OutputDirectory,
  [string]$SignToolPath,[string]$CertificateThumbprint,[string]$TimestampUrl,[switch]$RequireAuthenticode
)
$ErrorActionPreference='Stop'
$root=(Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
. (Join-Path $PSScriptRoot 'release-feed.ps1')
. (Join-Path $PSScriptRoot 'authenticode-signing.ps1')
. (Join-Path $PSScriptRoot 'release-identity.ps1')
$identity=ConvertTo-GrMetroReleaseVersion $MigrationVersion
$out=[IO.Path]::GetFullPath($OutputDirectory)
if(Test-Path -LiteralPath $out){throw 'The immutable Update Host migration output already exists.'}
$changes=@(& git.exe -C $root status --porcelain=v1 --untracked-files=all|Where-Object{$_-notmatch '^\?\? data/'})
if($LASTEXITCODE-ne0-or$changes.Count){throw 'Update Host migration builds require a clean committed source tree.'}
$commit=(& git.exe -C $root rev-parse HEAD).Trim();if($LASTEXITCODE-ne0-or$commit-notmatch'^[a-f0-9]{40}$'){throw 'Could not resolve the committed source identity.'}
$source=Read-GrMetroReleaseSource $ReleaseSourceConfigPath
if(-not$source.Enabled){throw 'Update Host migration requires an enabled HTTPS release source.'}
$keys=Get-GrMetroPinnedReleaseKeys $ReleasePublicKeysPath
Assert-GrMetroProvisionedKeyFingerprints $ReleasePublicKeysPath
$matchingKeys=@($keys.GetEnumerator()|Where-Object{$_.Value.AllowedChannels-contains$source.Channel})
if(-not$matchingKeys.Count){throw "No pinned public key is authorized for the $($source.Channel) release channel."}
New-Item -ItemType Directory -Path $out|Out-Null
$hostRoot=Join-Path $out 'host';New-Item -ItemType Directory -Path $hostRoot|Out-Null
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot 'build-update-host.ps1') -OutputDirectory $hostRoot
if($LASTEXITCODE-ne0){throw 'Could not build the GRMetro Update Host.'}
$hostExe=Join-Path $hostRoot 'GRMetro Update Host.exe'
$null=Invoke-GrMetroAuthenticodeSigning -Files @($hostExe) -SignToolPath $SignToolPath -CertificateThumbprint $CertificateThumbprint -TimestampUrl $TimestampUrl -RequireAuthenticode:$RequireAuthenticode
Copy-Item -LiteralPath $ReleaseSourceConfigPath -Destination (Join-Path $hostRoot 'release-source.default.json') -Force
Copy-Item -LiteralPath $ReleasePublicKeysPath -Destination (Join-Path $hostRoot 'release-public-keys.json') -Force
$policy=[ordered]@{schemaVersion=1;applyOnSetup=$true;updaterProtocol=1};[IO.File]::WriteAllText((Join-Path $hostRoot 'provisioning-policy.json'),(($policy|ConvertTo-Json -Compress)+[Environment]::NewLine),(New-Object Text.UTF8Encoding($false)))
$bundle=Join-Path $out "grmetro-update-host-migration-$MigrationVersion.zip"
Add-Type -AssemblyName System.IO.Compression.FileSystem
[IO.Compression.ZipFile]::CreateFromDirectory($hostRoot,$bundle)
foreach($name in @('install-update-host.ps1','update-host-installation.ps1','launch-integration.ps1','package-files.ps1','release-identity.ps1','release-feed.ps1')){Copy-Item -LiteralPath (Join-Path $PSScriptRoot $name) -Destination (Join-Path $out $name) -Force}
$signature=Get-AuthenticodeSignature -LiteralPath $hostExe
if($signature.Status-ne'Valid'){[IO.File]::WriteAllText((Join-Path $out 'NOT-PRODUCTION-READY-UNSIGNED.txt'),"The GRMetro Update Host is unsigned. Installation requires explicit internal security approval.`r`n",(New-Object Text.UTF8Encoding($false)))}
$keyDocument=Get-Content -LiteralPath $ReleasePublicKeysPath -Raw|ConvertFrom-Json
$report=[ordered]@{schemaVersion=1;migrationVersion=$identity.ReleaseVersion;migrationSequence=$identity.ReleaseSequence;commit=$commit;builtAt=[DateTime]::UtcNow.ToString('o');channel=$source.Channel;metadataUrl=$source.MetadataUrl;signatureUrl=$source.SignatureUrl;allowedHosts=@($source.AllowedHosts);keyIds=@($keyDocument.keys|ForEach-Object{[string]$_.keyId});keyFingerprints=@($keyDocument.keys|ForEach-Object{[string]$_.fingerprintSha256});bundleFile=[IO.Path]::GetFileName($bundle);bundleBytes=(Get-Item $bundle).Length;bundleSha256=(Get-FileHash $bundle -Algorithm SHA256).Hash;hostSha256=(Get-FileHash $hostExe -Algorithm SHA256).Hash;authenticodeStatus=[string]$signature.Status;updaterProtocol=1}
[IO.File]::WriteAllText((Join-Path $out 'migration-build.json'),(($report|ConvertTo-Json -Depth 5)+[Environment]::NewLine),(New-Object Text.UTF8Encoding($false)))
$report|ConvertTo-Json -Depth 5
