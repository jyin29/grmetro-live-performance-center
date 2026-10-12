param(
  [Parameter(Mandatory=$true)][string]$Version,
  [ValidateSet('stable','testing')][string]$Channel='stable',
  [Parameter(Mandatory=$true)][string]$ArtifactUrl,
  [Parameter(Mandatory=$true)][string]$SigningKeyPath,
  [Parameter(Mandatory=$true)][string]$KeyId,
  [Parameter(Mandatory=$true)][string]$ReleaseNotesPath,
  [string]$OutputRoot,
  [string]$ArtifactZip,
  [string]$ReleaseSourceConfigPath,[string]$ReleasePublicKeysPath,[switch]$ProvisionReleaseTrust,
  [string]$SignToolPath,[string]$CertificateThumbprint,[string]$TimestampUrl,[switch]$RequireAuthenticode,
  [switch]$SkipBuild,
  [switch]$AllowDirtyTest,
  [switch]$AllowInsecureTestUrl
)
$ErrorActionPreference='Stop'
$root=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..')).TrimEnd('\')
. (Join-Path $PSScriptRoot 'release-identity.ps1')
. (Join-Path $PSScriptRoot 'release-feed.ps1')
$identity=ConvertTo-GrMetroReleaseVersion $Version
if($identity.Development-or$Version-eq'0.0.0.0'){throw 'Production release creation requires an explicit nondevelopment CalVer.'}
if($KeyId-notmatch'^[A-Za-z0-9._-]{1,64}$'){throw 'Signing key ID is invalid.'}
$keyPath=[IO.Path]::GetFullPath($SigningKeyPath);if($keyPath.StartsWith($root+'\',[StringComparison]::OrdinalIgnoreCase)){throw 'Private signing key must remain outside the repository.'}
if(-not(Test-Path -LiteralPath $keyPath -PathType Leaf)){throw 'External private signing key was not found.'}
if(-not(Test-Path -LiteralPath $ReleaseNotesPath -PathType Leaf)){throw 'Release notes file was not found.'}
if($AllowDirtyTest-or$SkipBuild-or$AllowInsecureTestUrl){if($env:GRMETRO_UPDATER_TEST_MODE-ne'true'){throw 'Release test overrides are disabled outside disposable tests.'}}
if(-not$AllowDirtyTest){
  $git=(Get-Command git.exe -ErrorAction Stop).Source;$status=@(&$git -C $root status --porcelain --untracked-files=all|Where-Object{$_-notmatch'^\?\? data/'})
  if($LASTEXITCODE-ne0-or$status.Count){throw 'Production release creation requires a clean committed working tree.'}
}
if(-not$OutputRoot){$OutputRoot=Join-Path $root 'dist\windows-releases'};$OutputRoot=[IO.Path]::GetFullPath($OutputRoot)
New-Item -ItemType Directory -Force -Path $OutputRoot|Out-Null
foreach($directory in @(Get-ChildItem -LiteralPath $OutputRoot -Directory -ErrorAction SilentlyContinue)){
  if($directory.Name-match'^GRMetro-(\d{4}\.\d{1,2}\.\d{1,2}\.\d{1,4})$'){
    $existing=$matches[1];if((Compare-GrMetroReleaseVersion $existing $Version)-ge0){throw "Release identity is reused or not newer than local release output: $existing"}
  }
}
$releaseDirectory=Join-Path $OutputRoot ("GRMetro-$Version");if(Test-Path -LiteralPath $releaseDirectory){throw 'Release output already exists.'}

$uri=$null;if(-not[Uri]::TryCreate($ArtifactUrl,[UriKind]::Absolute,[ref]$uri)-or$uri.UserInfo-or$uri.IsUnc){throw 'Artifact URL is invalid or contains credentials.'}
if($uri.Scheme-ne'https' -and -not($AllowInsecureTestUrl-and$uri.Scheme-eq'http'-and$uri.Host-in@('127.0.0.1','localhost'))){throw 'Production release artifact URL must use HTTPS.'}
$notes=@(Get-Content -LiteralPath $ReleaseNotesPath|ForEach-Object{$_.Trim()}|Where-Object{$_})
if(-not$notes-or$notes.Count-gt100-or(($notes-join"`n").Length)-gt20000){throw 'Release notes must contain bounded plain text.'}

if(-not$SkipBuild){
  $buildArguments=@('-NoProfile','-ExecutionPolicy','Bypass','-File',(Join-Path $PSScriptRoot 'build-installer.ps1'),'-ReleaseVersion',$Version,'-Channel',$Channel,'-UpdaterProtocol','1')
  if($ProvisionReleaseTrust){$buildArguments+=@('-ProvisionReleaseTrust','-ReleaseSourceConfigPath',$ReleaseSourceConfigPath,'-ReleasePublicKeysPath',$ReleasePublicKeysPath)}
  if($RequireAuthenticode){$buildArguments+='-RequireAuthenticode'}
  if($SignToolPath){$buildArguments+=@('-SignToolPath',$SignToolPath)};if($CertificateThumbprint){$buildArguments+=@('-CertificateThumbprint',$CertificateThumbprint)};if($TimestampUrl){$buildArguments+=@('-TimestampUrl',$TimestampUrl)}
  & powershell.exe @buildArguments
  if($LASTEXITCODE-ne0){throw 'Windows release package build failed.'}
  $ArtifactZip=Join-Path $root 'dist\windows-installer\grmetro-performance-center-package.zip'
}
if(-not$ArtifactZip-or-not(Test-Path -LiteralPath $ArtifactZip -PathType Leaf)){throw 'Release artifact ZIP is missing.'}
$packageMetadata=Get-GrMetroPackageReleaseMetadata $ArtifactZip
if([string]$packageMetadata.releaseVersion-ne$Version-or[string]$packageMetadata.channel-ne$Channel){throw 'Artifact deployment identity does not match requested release.'}

New-Item -ItemType Directory -Path $releaseDirectory|Out-Null
$artifactName="grmetro-performance-center-$Version.zip";$artifactOutput=Join-Path $releaseDirectory $artifactName
Copy-Item -LiteralPath $ArtifactZip -Destination $artifactOutput
$artifactSize=(Get-Item -LiteralPath $artifactOutput).Length;$artifactHash=(Get-FileHash -LiteralPath $artifactOutput -Algorithm SHA256).Hash
$metadata=[ordered]@{schemaVersion=1;releaseVersion=$identity.ReleaseVersion;releaseSequence=$identity.ReleaseSequence;channel=$Channel;artifactUrl=$uri.AbsoluteUri;artifactSize=[Int64]$artifactSize;artifactSha256=$artifactHash;minimumUpdaterProtocol=1;authenticodeRequired=[bool]$RequireAuthenticode;publishedAt=[DateTime]::UtcNow.ToString('o');releaseNotes=$notes;keyId=$KeyId}
$metadataBytes=(New-Object Text.UTF8Encoding $false).GetBytes(($metadata|ConvertTo-Json -Compress -Depth 5))
$metadataPath=Join-Path $releaseDirectory 'release.json';[IO.File]::WriteAllBytes($metadataPath,$metadataBytes)

$privateXml=Get-Content -LiteralPath $keyPath -Raw;$rsa=New-Object Security.Cryptography.RSACryptoServiceProvider
try{$rsa.PersistKeyInCsp=$false;$rsa.FromXmlString($privateXml);if(-not$AllowDirtyTest-and$rsa.KeySize-lt3072){throw 'Production release signing key must be at least RSA-3072.'};$signature=$rsa.SignData($metadataBytes,[Security.Cryptography.CryptoConfig]::MapNameToOID('SHA256'));$publicXml=$rsa.ToXmlString($false)}finally{$rsa.Dispose()}
$signatureDocument=[ordered]@{schemaVersion=1;keyId=$KeyId;algorithm='RSA-SHA256';signature=[Convert]::ToBase64String($signature)}
$signatureBytes=(New-Object Text.UTF8Encoding $false).GetBytes(($signatureDocument|ConvertTo-Json -Compress));$signaturePath=Join-Path $releaseDirectory 'release.json.sig';[IO.File]::WriteAllBytes($signaturePath,$signatureBytes)
if(-not(Test-GrMetroReleaseSignature $metadataBytes $signature $publicXml)){throw 'Release signature self-verification failed.'}
$publicDocument=[ordered]@{schemaVersion=1;keys=@([ordered]@{keyId=$KeyId;algorithm='RSA-SHA256';publicKeyXml=$publicXml;fingerprintSha256=(Get-GrMetroPublicKeyFingerprint $publicXml);allowedChannels=@($Channel);testOnly=[bool]$AllowDirtyTest})}
[IO.File]::WriteAllText((Join-Path $releaseDirectory 'release-public-key.provisioning.json'),(($publicDocument|ConvertTo-Json -Depth 5)+[Environment]::NewLine),(New-Object Text.UTF8Encoding $false))
[IO.File]::WriteAllText((Join-Path $releaseDirectory 'release-notes.txt'),(($notes-join[Environment]::NewLine)+[Environment]::NewLine),(New-Object Text.UTF8Encoding $false))
if(-not$RequireAuthenticode){[IO.File]::WriteAllText((Join-Path $releaseDirectory 'NOT-PRODUCTION-READY-UNSIGNED.txt'),"This candidate was built without required Authenticode validation and must not be published or deployed as a production release.`r`n",(New-Object Text.UTF8Encoding $false))}

$outputFiles=@(Get-ChildItem -LiteralPath $releaseDirectory -File)
foreach($file in $outputFiles){$content=if($file.Extension-in@('.json','.txt')){Get-Content -LiteralPath $file.FullName -Raw}else{''};if($content-and($content.Contains($privateXml)-or$content.Contains($keyPath))){throw 'Private signing key material or path entered release output.'}}
[pscustomobject]@{releaseDirectory=$releaseDirectory;releaseVersion=$Version;channel=$Channel;artifact=$artifactOutput;artifactSize=$artifactSize;artifactSha256=$artifactHash;metadata=$metadataPath;signature=$signaturePath;keyId=$KeyId}|ConvertTo-Json -Compress
