param(
  [ValidateSet('Generate','ExportPublic','Fingerprint','VerifyPair')][string]$Action,
  [string]$KeyId,[string]$PrivateKeyPath,[string]$PublicKeyPath,[ValidateSet(3072,4096)][int]$KeySize=3072,
  [ValidateSet('stable','testing')][string]$ChannelScope='stable',
  [switch]$ConfirmProductionKeyGeneration
)
$ErrorActionPreference='Stop'
$root=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..')).TrimEnd('\')
. (Join-Path $PSScriptRoot 'release-feed.ps1')
function Assert-External([string]$Path){$full=[IO.Path]::GetFullPath($Path);if($full.StartsWith($root+'\',[StringComparison]::OrdinalIgnoreCase)){throw 'Release-signing key files must remain outside the repository.'};return $full}
function Read-Private([string]$Path){$rsa=New-Object Security.Cryptography.RSACryptoServiceProvider;try{$rsa.PersistKeyInCsp=$false;$rsa.FromXmlString((Get-Content -LiteralPath $Path -Raw));if($rsa.PublicOnly){throw 'Private-key file does not contain private RSA material.'};return [pscustomobject]@{PrivateXml=$rsa.ToXmlString($true);PublicXml=$rsa.ToXmlString($false);KeySize=$rsa.KeySize}}finally{$rsa.Dispose()}}
if($KeyId-and$KeyId-notmatch'^[A-Za-z0-9._-]{1,64}$'){throw 'Key ID is invalid.'}
switch($Action){
  'Generate'{
    if(-not$ConfirmProductionKeyGeneration){throw 'Production key generation requires the explicit ConfirmProductionKeyGeneration switch.'}
    if(-not$KeyId-or-not$PrivateKeyPath-or-not$PublicKeyPath){throw 'Generate requires key ID, private-key path, and public-key path.'}
    $private=Assert-External $PrivateKeyPath;$public=Assert-External $PublicKeyPath
    if((Test-Path -LiteralPath $private)-or(Test-Path -LiteralPath $public)){throw 'Key output already exists; refusing to overwrite it.'}
    New-Item -ItemType Directory -Force -Path ([IO.Path]::GetDirectoryName($private)),([IO.Path]::GetDirectoryName($public))|Out-Null
    $rsa=New-Object Security.Cryptography.RSACryptoServiceProvider $KeySize
    try{$rsa.PersistKeyInCsp=$false;$privateXml=$rsa.ToXmlString($true);$publicXml=$rsa.ToXmlString($false)}finally{$rsa.Dispose()}
    [IO.File]::WriteAllText($private,$privateXml,(New-Object Text.UTF8Encoding $false))
    $document=[ordered]@{schemaVersion=1;keys=@([ordered]@{keyId=$KeyId;algorithm='RSA-SHA256';publicKeyXml=$publicXml;fingerprintSha256=(Get-GrMetroPublicKeyFingerprint $publicXml);allowedChannels=@($ChannelScope);testOnly=$false})}
    [IO.File]::WriteAllText($public,(($document|ConvertTo-Json -Depth 5)+[Environment]::NewLine),(New-Object Text.UTF8Encoding $false))
    Write-Output "Generated external RSA-$KeySize release key. Public fingerprint: $($document.keys[0].fingerprintSha256)"
  }
  'ExportPublic'{
    if(-not$KeyId-or-not$PrivateKeyPath-or-not$PublicKeyPath){throw 'ExportPublic requires key ID, private-key path, and public-key path.'}
    $private=Assert-External $PrivateKeyPath;$public=Assert-External $PublicKeyPath;if(Test-Path -LiteralPath $public){throw 'Public-key output already exists.'};$pair=Read-Private $private
    if($pair.KeySize-lt3072){throw 'Production release key must be at least RSA-3072.'};$fingerprint=Get-GrMetroPublicKeyFingerprint $pair.PublicXml
    $document=[ordered]@{schemaVersion=1;keys=@([ordered]@{keyId=$KeyId;algorithm='RSA-SHA256';publicKeyXml=$pair.PublicXml;fingerprintSha256=$fingerprint;allowedChannels=@($ChannelScope);testOnly=$false})};[IO.File]::WriteAllText($public,(($document|ConvertTo-Json -Depth 5)+[Environment]::NewLine),(New-Object Text.UTF8Encoding $false));Write-Output "Exported public key. Fingerprint: $fingerprint"
  }
  'Fingerprint'{
    if(-not$PublicKeyPath){throw 'Fingerprint requires a public-key file.'};$document=Get-Content -LiteralPath $PublicKeyPath -Raw|ConvertFrom-Json;foreach($key in @($document.keys)){Write-Output "$($key.keyId) $(Get-GrMetroPublicKeyFingerprint ([string]$key.publicKeyXml))"}
  }
  'VerifyPair'{
    if(-not$KeyId-or-not$PrivateKeyPath-or-not$PublicKeyPath){throw 'VerifyPair requires key ID, private-key path, and public-key path.'}
    $pair=Read-Private (Assert-External $PrivateKeyPath);$document=Get-Content -LiteralPath $PublicKeyPath -Raw|ConvertFrom-Json;$public=@($document.keys|Where-Object{$_.keyId-eq$KeyId})|Select-Object -First 1;if(-not$public){throw 'Public-key file does not contain the requested key ID.'}
    $left=Get-GrMetroPublicKeyFingerprint $pair.PublicXml;$right=Get-GrMetroPublicKeyFingerprint ([string]$public.publicKeyXml);if($left-ne$right){throw 'Public and private release keys do not match.'}
    $probe=(New-Object Text.UTF8Encoding $false).GetBytes('GRMetro release key pair verification');$rsa=New-Object Security.Cryptography.RSACryptoServiceProvider;try{$rsa.PersistKeyInCsp=$false;$rsa.FromXmlString($pair.PrivateXml);$signature=$rsa.SignData($probe,[Security.Cryptography.CryptoConfig]::MapNameToOID('SHA256'))}finally{$rsa.Dispose()};if(-not(Test-GrMetroReleaseSignature $probe $signature ([string]$public.publicKeyXml))){throw 'Public/private release key verification failed.'};Write-Output "Release key pair verified. Fingerprint: $left"
  }
}
