# Authenticode support for GRMetro release binaries. Private keys remain in the
# Windows certificate store; this module never exports or serializes them.

function ConvertTo-GrMetroCertificateThumbprint {
  param([Parameter(Mandatory=$true)][string]$Thumbprint)
  $normalized=$Thumbprint.Replace(' ','').ToUpperInvariant()
  if($normalized-notmatch'^[A-F0-9]{40}$'){throw 'Authenticode certificate thumbprint must be a SHA-1 certificate thumbprint.'}
  return $normalized
}

function Read-GrMetroAuthenticodePolicy {
  param([Parameter(Mandatory=$true)][string]$Path)
  $resolved=[IO.Path]::GetFullPath($Path)
  if(-not(Test-Path -LiteralPath $resolved -PathType Leaf)){throw 'Authenticode policy file was not found.'}
  try{$policy=Get-Content -LiteralPath $resolved -Raw|ConvertFrom-Json}catch{throw 'Authenticode policy is not valid JSON.'}
  if([int]$policy.schemaVersion-ne1){throw 'Unsupported Authenticode policy schema.'}
  $signerThumbprint=ConvertTo-GrMetroCertificateThumbprint ([string]$policy.signingCertificateThumbprint)
  $rootThumbprint=ConvertTo-GrMetroCertificateThumbprint ([string]$policy.rootCertificateThumbprint)
  $signerSha256=([string]$policy.signingCertificateSha256).ToUpperInvariant()
  $rootSha256=([string]$policy.rootCertificateSha256).ToUpperInvariant()
  if($signerSha256-notmatch'^[A-F0-9]{64}$'-or$rootSha256-notmatch'^[A-F0-9]{64}$'){throw 'Authenticode policy public certificate SHA-256 values are invalid.'}
  if(-not$policy.signingCertificateSubject-or-not$policy.rootCertificateSubject){throw 'Authenticode policy certificate subjects are required.'}
  $minimumDays=[int]$policy.minimumValidityDays
  if($minimumDays-lt30-or$minimumDays-gt365){throw 'Authenticode policy minimum validity must be between 30 and 365 days.'}
  $timestamp=$null
  if(-not[Uri]::TryCreate([string]$policy.timestampUrl,[UriKind]::Absolute,[ref]$timestamp)-or$timestamp.Scheme-notin@('http','https')-or$timestamp.UserInfo){throw 'Authenticode timestamp URL must be a credential-free HTTP(S) endpoint.'}
  if($timestamp.Scheme-eq'http'-and$timestamp.Host-notin@('timestamp.sectigo.com','timestamp.digicert.com')){throw 'Plain-HTTP Authenticode timestamping is restricted to an approved timestamp authority.'}
  return [pscustomobject]@{
    Path=$resolved
    SigningCertificateThumbprint=$signerThumbprint
    SigningCertificateSubject=[string]$policy.signingCertificateSubject
    RootCertificateThumbprint=$rootThumbprint
    RootCertificateSha256=$rootSha256
    RootCertificateSubject=[string]$policy.rootCertificateSubject
    MinimumValidityDays=$minimumDays
    TimestampUrl=$timestamp.AbsoluteUri
    RootCertificateFileName=[string]$policy.rootCertificateFileName
    SigningCertificateFileName=[string]$policy.signingCertificateFileName
    SigningCertificateSha256=$signerSha256
  }
}

function Get-GrMetroSignTool([string]$SignToolPath) {
  if($SignToolPath){
    $resolved=[IO.Path]::GetFullPath($SignToolPath)
    if(-not(Test-Path -LiteralPath $resolved -PathType Leaf)){throw 'Configured SignTool executable was not found.'}
    return $resolved
  }
  $command=Get-Command signtool.exe -ErrorAction SilentlyContinue
  if($command){return $command.Source}
  return $null
}

function Get-GrMetroCodeSigningCertificate {
  param([Parameter(Mandatory=$true)][string]$CertificateThumbprint)
  $thumbprint=ConvertTo-GrMetroCertificateThumbprint $CertificateThumbprint
  $matches=@()
  foreach($store in @('Cert:\CurrentUser\My','Cert:\LocalMachine\My')){
    $candidate=Get-ChildItem -LiteralPath $store -ErrorAction SilentlyContinue|Where-Object{$_.Thumbprint.Replace(' ','').ToUpperInvariant()-eq$thumbprint}
    foreach($certificate in @($candidate)){$matches+=$certificate}
  }
  $withPrivateKey=@($matches|Where-Object{$_.HasPrivateKey})
  if($withPrivateKey.Count-ne1){throw "Exactly one accessible code-signing certificate with private key is required for thumbprint $thumbprint; found $($withPrivateKey.Count)."}
  return $withPrivateKey[0]
}

function Assert-GrMetroCodeSigningCertificate {
  param(
    [Parameter(Mandatory=$true)][Security.Cryptography.X509Certificates.X509Certificate2]$Certificate,
    [int]$MinimumValidityDays=30,
    [string]$ExpectedSubject
  )
  if(-not$Certificate.HasPrivateKey){throw 'The Authenticode certificate private key is unavailable.'}
  if($ExpectedSubject-and$Certificate.Subject-ne$ExpectedSubject){throw 'The Authenticode certificate subject does not match policy.'}
  if($Certificate.NotBefore.ToUniversalTime()-gt[DateTime]::UtcNow){throw 'The Authenticode certificate is not valid yet.'}
  if($Certificate.NotAfter.ToUniversalTime()-le[DateTime]::UtcNow.AddDays($MinimumValidityDays)){throw "The Authenticode certificate expires within $MinimumValidityDays days."}
  $codeSigning=$false
  foreach($extension in $Certificate.Extensions){
    if($extension-is[Security.Cryptography.X509Certificates.X509EnhancedKeyUsageExtension]){
      foreach($usage in $extension.EnhancedKeyUsages){if($usage.Value-eq'1.3.6.1.5.5.7.3.3'){$codeSigning=$true}}
    }
  }
  if(-not$codeSigning){throw 'The selected certificate does not include the Code Signing EKU.'}
  if($Certificate.SignatureAlgorithm.Value-notin@('1.2.840.113549.1.1.11','1.2.840.113549.1.1.12','1.2.840.113549.1.1.13')){throw 'The selected certificate was not issued with SHA-256-or-stronger RSA.'}
  $keySize=$Certificate.PublicKey.Key.KeySize
  if($keySize-lt3072){throw 'The selected Authenticode certificate must use RSA-3072 or stronger.'}
  return $Certificate
}

function Get-GrMetroPublicCertificate {
  param([Parameter(Mandatory=$true)][string]$Path,[string]$ExpectedThumbprint,[string]$ExpectedSubject,[string]$ExpectedSha256)
  $resolved=[IO.Path]::GetFullPath($Path)
  if(-not(Test-Path -LiteralPath $resolved -PathType Leaf)){throw 'Pinned public certificate file was not found.'}
  if($ExpectedSha256){
    $sha=New-Object Security.Cryptography.SHA256Managed
    try{$actualSha=([BitConverter]::ToString($sha.ComputeHash([IO.File]::ReadAllBytes($resolved)))).Replace('-','')}finally{$sha.Dispose()}
    if($actualSha-ne$ExpectedSha256.ToUpperInvariant()){throw 'Pinned public certificate SHA-256 does not match policy.'}
  }
  $certificate=New-Object Security.Cryptography.X509Certificates.X509Certificate2($resolved)
  if($ExpectedThumbprint-and$certificate.Thumbprint.Replace(' ','').ToUpperInvariant()-ne(ConvertTo-GrMetroCertificateThumbprint $ExpectedThumbprint)){throw 'Pinned public certificate thumbprint does not match policy.'}
  if($ExpectedSubject-and$certificate.Subject-ne$ExpectedSubject){throw 'Pinned public certificate subject does not match policy.'}
  return $certificate
}

function Assert-GrMetroPinnedCertificateChain {
  param(
    [Parameter(Mandatory=$true)][Security.Cryptography.X509Certificates.X509Certificate2]$Certificate,
    [Parameter(Mandatory=$true)][Security.Cryptography.X509Certificates.X509Certificate2]$RootCertificate
  )
  $chain=New-Object Security.Cryptography.X509Certificates.X509Chain
  try{
    $chain.ChainPolicy.RevocationMode=[Security.Cryptography.X509Certificates.X509RevocationMode]::NoCheck
    $chain.ChainPolicy.VerificationFlags=[Security.Cryptography.X509Certificates.X509VerificationFlags]::AllowUnknownCertificateAuthority
    $null=$chain.ChainPolicy.ExtraStore.Add($RootCertificate)
    if(-not$chain.Build($Certificate)){throw 'The signing certificate does not build to the pinned internal root.'}
    if($chain.ChainElements.Count-lt2){throw 'The signing certificate chain is incomplete.'}
    $actualRoot=$chain.ChainElements[$chain.ChainElements.Count-1].Certificate
    if($actualRoot.Thumbprint-ne$RootCertificate.Thumbprint){throw 'The signing certificate chain terminates at an unexpected root.'}
    $unexpected=@($chain.ChainStatus|Where-Object{$_.Status-ne[Security.Cryptography.X509Certificates.X509ChainStatusFlags]::UntrustedRoot})
    if($unexpected.Count){throw "The signing certificate chain has an unexpected status: $($unexpected[0].Status)"}
  } finally {$chain.Dispose()}
  return $true
}

function Assert-GrMetroAuthenticodeSignature {
  param(
    [Parameter(Mandatory=$true)][string]$Path,
    [string]$CertificateThumbprint,
    [string]$PinnedRootCertificatePath,
    [string]$PinnedRootThumbprint,
    [string]$PinnedRootSubject,
    [string]$PinnedRootSha256
  )
  if(-not(Test-Path -LiteralPath $Path -PathType Leaf)){throw 'Authenticode verification target is missing.'}
  $signature=Get-AuthenticodeSignature -LiteralPath $Path
  if(-not$signature.SignerCertificate){throw "Authenticode signature is missing: $([IO.Path]::GetFileName($Path))"}
  if($CertificateThumbprint-and$signature.SignerCertificate.Thumbprint.Replace(' ','').ToUpperInvariant()-ne(ConvertTo-GrMetroCertificateThumbprint $CertificateThumbprint)){throw "Authenticode signer thumbprint does not match policy: $([IO.Path]::GetFileName($Path))"}
  if($signature.Status-ne[Management.Automation.SignatureStatus]::Valid){
    if(-not$PinnedRootCertificatePath-or$signature.Status-ne[Management.Automation.SignatureStatus]::UnknownError){throw "Authenticode signature is not valid: $([IO.Path]::GetFileName($Path)) ($($signature.Status))"}
    $root=Get-GrMetroPublicCertificate -Path $PinnedRootCertificatePath -ExpectedThumbprint $PinnedRootThumbprint -ExpectedSubject $PinnedRootSubject -ExpectedSha256 $PinnedRootSha256
    $null=Assert-GrMetroPinnedCertificateChain -Certificate $signature.SignerCertificate -RootCertificate $root
  }
  return $signature
}

function Invoke-GrMetroAuthenticodeSigning {
  param(
    [string[]]$Files,
    [string]$SignToolPath,
    [string]$CertificateThumbprint,
    [string]$TimestampUrl,
    [switch]$RequireAuthenticode,
    [string]$PinnedRootCertificatePath,
    [string]$PinnedRootThumbprint,
    [string]$PinnedRootSubject,
    [string]$PinnedRootSha256,
    [string]$ExpectedCertificateSubject,
    [int]$MinimumCertificateValidityDays=30
  )
  $files=@($Files|Where-Object{$_})
  foreach($file in $files){if(-not(Test-Path -LiteralPath $file -PathType Leaf)){throw "Authenticode target is missing: $file"}}
  if(-not$CertificateThumbprint){
    if($RequireAuthenticode){throw 'Production Authenticode is required but no certificate thumbprint was supplied.'}
    return @($files|ForEach-Object{[pscustomobject]@{Path=$_;Status='Unsigned development build'}})
  }
  $thumbprint=ConvertTo-GrMetroCertificateThumbprint $CertificateThumbprint
  $timestamp=$null
  if(-not[Uri]::TryCreate($TimestampUrl,[UriKind]::Absolute,[ref]$timestamp)-or$timestamp.Scheme-notin@('http','https')-or$timestamp.UserInfo){throw 'Authenticode timestamp URL must be a credential-free HTTP(S) endpoint.'}
  if($timestamp.Scheme-eq'http'-and$timestamp.Host-notin@('timestamp.sectigo.com','timestamp.digicert.com')){throw 'Plain-HTTP Authenticode timestamping is restricted to an approved timestamp authority.'}
  $certificate=Get-GrMetroCodeSigningCertificate $thumbprint
  $null=Assert-GrMetroCodeSigningCertificate -Certificate $certificate -MinimumValidityDays $MinimumCertificateValidityDays -ExpectedSubject $ExpectedCertificateSubject
  if($PinnedRootCertificatePath){
    $root=Get-GrMetroPublicCertificate -Path $PinnedRootCertificatePath -ExpectedThumbprint $PinnedRootThumbprint -ExpectedSubject $PinnedRootSubject -ExpectedSha256 $PinnedRootSha256
    $null=Assert-GrMetroPinnedCertificateChain -Certificate $certificate -RootCertificate $root
  }
  $signTool=Get-GrMetroSignTool $SignToolPath
  $results=@()
  foreach($file in $files){
    if($signTool){
      & $signTool sign /sha1 $thumbprint /fd SHA256 /tr $timestamp.AbsoluteUri /td SHA256 /a $file
      if($LASTEXITCODE-ne0){throw "SignTool failed for $([IO.Path]::GetFileName($file)) with exit code $LASTEXITCODE."}
      $method='SignTool'
    }else{
      $result=Set-AuthenticodeSignature -LiteralPath $file -Certificate $certificate -HashAlgorithm SHA256 -IncludeChain All -TimestampServer $timestamp.AbsoluteUri
      if(-not$result.SignerCertificate-or$result.Status-in@([Management.Automation.SignatureStatus]::NotSigned,[Management.Automation.SignatureStatus]::HashMismatch)){throw "PowerShell Authenticode signing failed for $([IO.Path]::GetFileName($file)): $($result.Status)"}
      $method='PowerShell'
    }
    $signature=Assert-GrMetroAuthenticodeSignature -Path $file -CertificateThumbprint $thumbprint -PinnedRootCertificatePath $PinnedRootCertificatePath -PinnedRootThumbprint $PinnedRootThumbprint -PinnedRootSubject $PinnedRootSubject -PinnedRootSha256 $PinnedRootSha256
    if(-not$signature.TimeStamperCertificate){throw "Authenticode timestamp is missing: $([IO.Path]::GetFileName($file))"}
    $results+=[pscustomobject]@{Path=$file;Status=[string]$signature.Status;Thumbprint=$signature.SignerCertificate.Thumbprint;Method=$method;TimestampSubject=$signature.TimeStamperCertificate.Subject}
  }
  return $results
}
