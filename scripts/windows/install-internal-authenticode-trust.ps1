[CmdletBinding(SupportsShouldProcess=$true,ConfirmImpact='High')]
param(
  [Parameter(Mandatory=$true)][string]$PolicyPath,
  [Parameter(Mandatory=$true)][string]$RootCertificatePath,
  [Parameter(Mandatory=$true)][string]$SigningCertificatePath,
  [ValidateSet('LocalMachine','CurrentUser')][string]$StoreScope='LocalMachine',
  [switch]$ConfirmTrustInstallation
)
$ErrorActionPreference='Stop'
. (Join-Path $PSScriptRoot 'authenticode-signing.ps1')
$policy=Read-GrMetroAuthenticodePolicy $PolicyPath
if(-not$ConfirmTrustInstallation){throw 'Trust installation requires -ConfirmTrustInstallation.'}
if($StoreScope-eq'LocalMachine'){
  $identity=[Security.Principal.WindowsIdentity]::GetCurrent()
  $principal=New-Object Security.Principal.WindowsPrincipal($identity)
  if(-not$principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)){throw 'LocalMachine trust installation requires an elevated administrator PowerShell session.'}
}
$root=Get-GrMetroPublicCertificate -Path $RootCertificatePath -ExpectedThumbprint $policy.RootCertificateThumbprint -ExpectedSubject $policy.RootCertificateSubject -ExpectedSha256 $policy.RootCertificateSha256
$signer=Get-GrMetroPublicCertificate -Path $SigningCertificatePath -ExpectedThumbprint $policy.SigningCertificateThumbprint -ExpectedSubject $policy.SigningCertificateSubject -ExpectedSha256 $policy.SigningCertificateSha256
if($root.NotAfter.ToUniversalTime()-le[DateTime]::UtcNow.AddDays(365)){throw 'Internal root certificate expires within one year; rotate the hierarchy before trust deployment.'}
if($signer.NotAfter.ToUniversalTime()-le[DateTime]::UtcNow.AddDays($policy.MinimumValidityDays)){throw "Internal signing certificate expires within $($policy.MinimumValidityDays) days."}
$basicConstraints=@($root.Extensions|Where-Object{$_-is[Security.Cryptography.X509Certificates.X509BasicConstraintsExtension]})
if($basicConstraints.Count-ne1-or-not$basicConstraints[0].CertificateAuthority){throw 'Pinned root certificate is not a certificate authority.'}
if($root.SignatureAlgorithm.Value-ne'1.2.840.113549.1.1.11'-or$signer.SignatureAlgorithm.Value-ne'1.2.840.113549.1.1.11'){throw 'Internal certificates must use RSA with SHA-256.'}
$hasCodeSigning=$false
foreach($extension in $signer.Extensions){if($extension-is[Security.Cryptography.X509Certificates.X509EnhancedKeyUsageExtension]){foreach($usage in $extension.EnhancedKeyUsages){if($usage.Value-eq'1.3.6.1.5.5.7.3.3'){$hasCodeSigning=$true}}}}
if(-not$hasCodeSigning){throw 'Signing certificate is missing the Code Signing EKU.'}
$null=Assert-GrMetroPinnedCertificateChain -Certificate $signer -RootCertificate $root

$rootStore="Cert:\$StoreScope\Root"
$publisherStore="Cert:\$StoreScope\TrustedPublisher"
foreach($pair in @(@{Store=$rootStore;Cert=$root},@{Store=$publisherStore;Cert=$signer})){
  $conflicts=@(Get-ChildItem -LiteralPath $pair.Store -ErrorAction SilentlyContinue|Where-Object{$_.Subject-eq$pair.Cert.Subject-and$_.Thumbprint-ne$pair.Cert.Thumbprint})
  if($conflicts.Count){throw "A different certificate with subject $($pair.Cert.Subject) already exists in $($pair.Store)."}
}
if(-not$PSCmdlet.ShouldProcess("$rootStore and $publisherStore",'Install pinned GRMetro internal Authenticode trust')){
  return [pscustomobject]@{Scope=$StoreScope;RootThumbprint=$root.Thumbprint;SigningThumbprint=$signer.Thumbprint;Trusted=$false;Planned=$true}
}
$null=Import-Certificate -FilePath ([IO.Path]::GetFullPath($RootCertificatePath)) -CertStoreLocation $rootStore
$null=Import-Certificate -FilePath ([IO.Path]::GetFullPath($SigningCertificatePath)) -CertStoreLocation $publisherStore
$installedRoot=Get-ChildItem -LiteralPath $rootStore|Where-Object{$_.Thumbprint-eq$root.Thumbprint}
$installedSigner=Get-ChildItem -LiteralPath $publisherStore|Where-Object{$_.Thumbprint-eq$signer.Thumbprint}
if(-not$installedRoot-or-not$installedSigner){throw 'GRMetro internal Authenticode trust installation did not complete.'}
$chain=New-Object Security.Cryptography.X509Certificates.X509Chain
try{
  $chain.ChainPolicy.RevocationMode=[Security.Cryptography.X509Certificates.X509RevocationMode]::NoCheck
  if(-not$chain.Build($signer)){throw 'Installed GRMetro signing certificate does not build to a trusted root.'}
}finally{$chain.Dispose()}
[pscustomobject]@{Scope=$StoreScope;RootThumbprint=$root.Thumbprint;SigningThumbprint=$signer.Thumbprint;Trusted=$true}
