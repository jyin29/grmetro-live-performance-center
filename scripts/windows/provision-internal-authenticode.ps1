[CmdletBinding()]
param(
  [ValidateSet('Generate','RenewSigner','Inspect')][string]$Action='Inspect',
  [string]$OutputDirectory="$env:USERPROFILE\GRMetro-Signing\authenticode\public",
  [string]$RootSubject='CN=GRMetro Internal Code Signing Root CA, O=GRMetro Heating & Cooling',
  [string]$SigningSubject='CN=GRMetro Internal Code Signing, O=GRMetro Heating & Cooling',
  [ValidateRange(3072,4096)][int]$KeySize=3072,
  [ValidateRange(5,20)][int]$RootValidityYears=10,
  [ValidateRange(1,5)][int]$SigningValidityYears=3,
  [switch]$ConfirmInternalCaCreation,
  [switch]$ConfirmSigningCertificateRenewal
)
$ErrorActionPreference='Stop'
$repository=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..')).TrimEnd('\')
$output=[IO.Path]::GetFullPath($OutputDirectory).TrimEnd('\')
if($output-eq$repository-or$output.StartsWith($repository+'\',[StringComparison]::OrdinalIgnoreCase)){throw 'Internal certificate output must remain outside the repository.'}
$rootPath=Join-Path $output 'grmetro-internal-code-signing-root-ca.cer'
$signerPath=Join-Path $output 'grmetro-internal-code-signing.cer'
$inventoryPath=Join-Path $output 'grmetro-internal-code-signing-inventory.json'

function Get-SubjectCertificates([string]$Subject){
  return @(Get-ChildItem Cert:\CurrentUser\My -ErrorAction SilentlyContinue|Where-Object{$_.Subject-eq$Subject})
}

if($Action-eq'Inspect'){
  $matches=@()
  $matches+=@(Get-SubjectCertificates $RootSubject)
  $matches+=@(Get-SubjectCertificates $SigningSubject)
  $matches|Select-Object Subject,Thumbprint,NotBefore,NotAfter,HasPrivateKey,@{n='CodeSigning';e={$found=$false;foreach($extension in $_.Extensions){if($extension-is[Security.Cryptography.X509Certificates.X509EnhancedKeyUsageExtension]){foreach($usage in $extension.EnhancedKeyUsages){if($usage.Value-eq'1.3.6.1.5.5.7.3.3'){$found=$true}}}};$found}}
  return
}

if($Action-eq'Generate'-and-not$ConfirmInternalCaCreation){throw 'Creating the persistent internal CA requires -ConfirmInternalCaCreation.'}
if($Action-eq'RenewSigner'-and-not$ConfirmSigningCertificateRenewal){throw 'Renewing the internal signing certificate requires -ConfirmSigningCertificateRenewal.'}
foreach($path in @($rootPath,$signerPath,$inventoryPath)){if(Test-Path -LiteralPath $path){throw "Refusing to overwrite existing certificate output: $path"}}
$existingRoot=Get-SubjectCertificates $RootSubject
$existingSigner=Get-SubjectCertificates $SigningSubject
if($Action-eq'Generate'-and($existingRoot.Count-or$existingSigner.Count)){throw 'A certificate with an internal GRMetro signing subject already exists. Refusing to create a second hierarchy.'}
if($Action-eq'RenewSigner'){
  if($existingRoot.Count-ne1-or-not$existingRoot[0].HasPrivateKey){throw 'Signer renewal requires exactly one accessible internal root private key.'}
  if($existingSigner.Count){throw 'Renewed signing certificate subject must be unique so old and new publishers can overlap safely.'}
}
New-Item -ItemType Directory -Path $output -Force|Out-Null

$root=$null
$signer=$null
$createdRoot=$false
try{
  if($Action-eq'Generate'){
    $root=New-SelfSignedCertificate -Type Custom -Subject $RootSubject -CertStoreLocation 'Cert:\CurrentUser\My' -Provider 'Microsoft Software Key Storage Provider' -KeyAlgorithm RSA -KeyLength $KeySize -HashAlgorithm SHA256 -KeyExportPolicy NonExportable -KeyUsage CertSign,CRLSign -TextExtension @('2.5.29.19={critical}{text}ca=1&pathlength=0') -NotAfter (Get-Date).AddYears($RootValidityYears)
    $createdRoot=$true
  }else{$root=$existingRoot[0]}
  $signerNotAfter=(Get-Date).AddYears($SigningValidityYears)
  if($signerNotAfter-ge$root.NotAfter.AddDays(-30)){$signerNotAfter=$root.NotAfter.AddDays(-30)}
  $signer=New-SelfSignedCertificate -Type Custom -Subject $SigningSubject -Signer $root -CertStoreLocation 'Cert:\CurrentUser\My' -Provider 'Microsoft Software Key Storage Provider' -KeyAlgorithm RSA -KeyLength $KeySize -HashAlgorithm SHA256 -KeyExportPolicy NonExportable -KeyUsage DigitalSignature -TextExtension @('2.5.29.19={critical}{text}ca=0','2.5.29.37={critical}{text}1.3.6.1.5.5.7.3.3') -NotAfter $signerNotAfter
  if(-not$root.HasPrivateKey-or-not$signer.HasPrivateKey){throw 'Generated internal certificate private key is unavailable.'}
  $codeSigning=$false
  foreach($extension in $signer.Extensions){if($extension-is[Security.Cryptography.X509Certificates.X509EnhancedKeyUsageExtension]){foreach($usage in $extension.EnhancedKeyUsages){if($usage.Value-eq'1.3.6.1.5.5.7.3.3'){$codeSigning=$true}}}}
  if(-not$codeSigning){throw 'Generated signing certificate is missing the Code Signing EKU.'}
  $null=Export-Certificate -Cert $root -FilePath $rootPath -Type CERT
  $null=Export-Certificate -Cert $signer -FilePath $signerPath -Type CERT
  $inventory=[ordered]@{
    schemaVersion=1
    generatedAt=[DateTime]::UtcNow.ToString('o')
    keySize=$KeySize
    keyExportPolicy='NonExportable'
    root=[ordered]@{subject=$root.Subject;thumbprint=$root.Thumbprint;notBefore=$root.NotBefore.ToUniversalTime().ToString('o');notAfter=$root.NotAfter.ToUniversalTime().ToString('o');publicCertificateSha256=(Get-FileHash -LiteralPath $rootPath -Algorithm SHA256).Hash;file=[IO.Path]::GetFileName($rootPath)}
    signer=[ordered]@{subject=$signer.Subject;thumbprint=$signer.Thumbprint;notBefore=$signer.NotBefore.ToUniversalTime().ToString('o');notAfter=$signer.NotAfter.ToUniversalTime().ToString('o');publicCertificateSha256=(Get-FileHash -LiteralPath $signerPath -Algorithm SHA256).Hash;file=[IO.Path]::GetFileName($signerPath)}
  }
  [IO.File]::WriteAllText($inventoryPath,(($inventory|ConvertTo-Json -Depth 5)+[Environment]::NewLine),(New-Object Text.UTF8Encoding $false))
  [pscustomobject]@{RootSubject=$root.Subject;RootThumbprint=$root.Thumbprint;RootExpires=$root.NotAfter;SigningSubject=$signer.Subject;SigningThumbprint=$signer.Thumbprint;SigningExpires=$signer.NotAfter;PublicCertificateDirectory=$output;PrivateKeysExportable=$false}
}catch{
  if($signer){Remove-Item -LiteralPath ("Cert:\CurrentUser\My\"+$signer.Thumbprint) -Force -ErrorAction SilentlyContinue}
  if($createdRoot-and$root){Remove-Item -LiteralPath ("Cert:\CurrentUser\My\"+$root.Thumbprint) -Force -ErrorAction SilentlyContinue}
  foreach($path in @($rootPath,$signerPath,$inventoryPath)){Remove-Item -LiteralPath $path -Force -ErrorAction SilentlyContinue}
  throw
}
