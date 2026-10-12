# Optional production Authenticode integration. No certificate is generated or stored here.
function Get-GrMetroSignTool([string]$SignToolPath) {
  if($SignToolPath){$resolved=[IO.Path]::GetFullPath($SignToolPath);if(-not(Test-Path -LiteralPath $resolved -PathType Leaf)){throw 'Configured SignTool executable was not found.'};return $resolved}
  $command=Get-Command signtool.exe -ErrorAction SilentlyContinue
  if($command){return $command.Source}
  return $null
}

function Assert-GrMetroAuthenticodeSignature([string]$Path,[string]$CertificateThumbprint) {
  $signature=Get-AuthenticodeSignature -LiteralPath $Path
  if($signature.Status-ne[Management.Automation.SignatureStatus]::Valid){throw "Authenticode signature is not valid: $([IO.Path]::GetFileName($Path)) ($($signature.Status))"}
  if($CertificateThumbprint-and$signature.SignerCertificate.Thumbprint.Replace(' ','').ToUpperInvariant()-ne$CertificateThumbprint.Replace(' ','').ToUpperInvariant()){throw "Authenticode signer thumbprint does not match policy: $([IO.Path]::GetFileName($Path))"}
  return $signature
}

function Invoke-GrMetroAuthenticodeSigning {
  param([string[]]$Files,[string]$SignToolPath,[string]$CertificateThumbprint,[string]$TimestampUrl,[switch]$RequireAuthenticode)
  $files=@($Files|Where-Object{$_});foreach($file in $files){if(-not(Test-Path -LiteralPath $file -PathType Leaf)){throw "Authenticode target is missing: $file"}}
  if(-not$CertificateThumbprint){if($RequireAuthenticode){throw 'Production Authenticode is required but no certificate thumbprint was supplied.'};return @($files|ForEach-Object{[pscustomobject]@{Path=$_;Status='Unsigned development build'}})}
  $thumbprint=$CertificateThumbprint.Replace(' ','').ToUpperInvariant();if($thumbprint-notmatch'^[A-F0-9]{40}$'){throw 'Authenticode certificate thumbprint must be a SHA-1 certificate thumbprint.'}
  $timestamp=$null;if(-not[Uri]::TryCreate($TimestampUrl,[UriKind]::Absolute,[ref]$timestamp)-or$timestamp.Scheme-ne'https'-or$timestamp.UserInfo){throw 'Authenticode RFC 3161 timestamp URL must be credential-free HTTPS.'}
  $signTool=Get-GrMetroSignTool $SignToolPath;if(-not$signTool){throw 'SignTool is required for Authenticode production signing.'}
  $results=@();foreach($file in $files){& $signTool sign /sha1 $thumbprint /fd SHA256 /tr $timestamp.AbsoluteUri /td SHA256 /a $file;if($LASTEXITCODE-ne0){throw "SignTool failed for $([IO.Path]::GetFileName($file)) with exit code $LASTEXITCODE."};$signature=Assert-GrMetroAuthenticodeSignature $file $thumbprint;$results+=[pscustomobject]@{Path=$file;Status=[string]$signature.Status;Thumbprint=$signature.SignerCertificate.Thumbprint}}
  return $results
}
