param(
  [Parameter(Mandatory=$true)][string]$PolicyPath,
  [Parameter(Mandatory=$true)][string]$RootCertificatePath,
  [string]$LauncherPath,
  [string]$PackagePath
)
$ErrorActionPreference='Stop'
$repository=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..')).TrimEnd('\')
. (Join-Path $repository 'scripts\windows\authenticode-signing.ps1')
function Assert([bool]$Condition,[string]$Message){if(-not$Condition){throw $Message}}
function Expect-Failure([scriptblock]$Action,[string]$Message){$failed=$false;try{&$Action}catch{$failed=$true};if(-not$failed){throw $Message}}
$policy=Read-GrMetroAuthenticodePolicy $PolicyPath
$root=Get-GrMetroPublicCertificate -Path $RootCertificatePath -ExpectedThumbprint $policy.RootCertificateThumbprint -ExpectedSubject $policy.RootCertificateSubject -ExpectedSha256 $policy.RootCertificateSha256
$certificate=Get-GrMetroCodeSigningCertificate $policy.SigningCertificateThumbprint
$null=Assert-GrMetroCodeSigningCertificate -Certificate $certificate -MinimumValidityDays $policy.MinimumValidityDays -ExpectedSubject $policy.SigningCertificateSubject
$null=Assert-GrMetroPinnedCertificateChain -Certificate $certificate -RootCertificate $root
$temporary=Join-Path $env:TEMP ('grmetro-authenticode-test-'+[guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $temporary|Out-Null
try{
  $scriptTarget=Join-Path $temporary 'disposable-test.ps1'
  [IO.File]::WriteAllText($scriptTarget,"'GRMetro Authenticode disposable test'`r`n",(New-Object Text.UTF8Encoding $false))
  $source=Join-Path $temporary 'disposable-test.cs'
  $exeTarget=Join-Path $temporary 'disposable-test.exe'
  [IO.File]::WriteAllText($source,'static class Program { static int Main() { return 0; } }',(New-Object Text.UTF8Encoding $false))
  $csc=Join-Path ([Runtime.InteropServices.RuntimeEnvironment]::GetRuntimeDirectory()) 'csc.exe'
  if(-not(Test-Path -LiteralPath $csc -PathType Leaf)){throw 'Windows C# compiler was not found for the disposable EXE test.'}
  & $csc /nologo /target:winexe ("/out:$exeTarget") $source
  if($LASTEXITCODE-ne0-or-not(Test-Path -LiteralPath $exeTarget)){throw 'Disposable EXE compilation failed.'}
  $result=Invoke-GrMetroAuthenticodeSigning -Files @($scriptTarget,$exeTarget) -CertificateThumbprint $policy.SigningCertificateThumbprint -TimestampUrl $policy.TimestampUrl -RequireAuthenticode -PinnedRootCertificatePath $RootCertificatePath -PinnedRootThumbprint $policy.RootCertificateThumbprint -PinnedRootSubject $policy.RootCertificateSubject -PinnedRootSha256 $policy.RootCertificateSha256 -ExpectedCertificateSubject $policy.SigningCertificateSubject -MinimumCertificateValidityDays $policy.MinimumValidityDays
  $results=@($result)
  Assert ($results.Count-eq2) 'Disposable signing did not return both signed artifacts.'
  foreach($item in $results){Assert ($item.Method-in@('PowerShell','SignTool')) 'Disposable signing used an unexpected method.'}
  foreach($target in @($scriptTarget,$exeTarget)){
    $signature=Assert-GrMetroAuthenticodeSignature -Path $target -CertificateThumbprint $policy.SigningCertificateThumbprint -PinnedRootCertificatePath $RootCertificatePath -PinnedRootThumbprint $policy.RootCertificateThumbprint -PinnedRootSubject $policy.RootCertificateSubject -PinnedRootSha256 $policy.RootCertificateSha256
    Assert ($signature.TimeStamperCertificate-ne$null) 'Disposable signature was not timestamped.'
  }
  if($LauncherPath){
    $launcherSource=[IO.Path]::GetFullPath($LauncherPath)
    if(-not(Test-Path -LiteralPath $launcherSource -PathType Leaf)){throw 'Launcher compatibility target was not found.'}
    $launcherOriginalHash=(Get-FileHash -LiteralPath $launcherSource -Algorithm SHA256).Hash
    $launcherTarget=Join-Path $temporary 'GRMetro Performance Center.exe'
    Copy-Item -LiteralPath $launcherSource -Destination $launcherTarget
    $launcherResult=Invoke-GrMetroAuthenticodeSigning -Files @($launcherTarget) -CertificateThumbprint $policy.SigningCertificateThumbprint -TimestampUrl $policy.TimestampUrl -RequireAuthenticode -PinnedRootCertificatePath $RootCertificatePath -PinnedRootThumbprint $policy.RootCertificateThumbprint -PinnedRootSubject $policy.RootCertificateSubject -PinnedRootSha256 $policy.RootCertificateSha256 -ExpectedCertificateSubject $policy.SigningCertificateSubject -MinimumCertificateValidityDays $policy.MinimumValidityDays
    Assert ($launcherResult.Thumbprint-eq$policy.SigningCertificateThumbprint) 'GRMetro launcher copy was signed by an unexpected certificate.'
    Assert ((Get-FileHash -LiteralPath $launcherSource -Algorithm SHA256).Hash-eq$launcherOriginalHash) 'Original GRMetro launcher changed during disposable signing validation.'
  }
  if($PackagePath){
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $archivePath=[IO.Path]::GetFullPath($PackagePath)
    if(-not(Test-Path -LiteralPath $archivePath -PathType Leaf)){throw 'Package compatibility target was not found.'}
    $packagedLauncher=Join-Path $temporary 'packaged-GRMetro-Performance-Center.exe'
    $archive=[IO.Compression.ZipFile]::OpenRead($archivePath)
    try{
      $entry=$archive.Entries|Where-Object{$_.FullName-eq'GRMetro Performance Center.exe'}|Select-Object -First 1
      if(-not$entry){throw 'Package compatibility target lacks the native launcher.'}
      [IO.Compression.ZipFileExtensions]::ExtractToFile($entry,$packagedLauncher,$false)
    }finally{$archive.Dispose()}
    $packageSignature=Assert-GrMetroAuthenticodeSignature -Path $packagedLauncher -CertificateThumbprint $policy.SigningCertificateThumbprint -PinnedRootCertificatePath $RootCertificatePath -PinnedRootThumbprint $policy.RootCertificateThumbprint -PinnedRootSubject $policy.RootCertificateSubject -PinnedRootSha256 $policy.RootCertificateSha256
    Assert ($packageSignature.TimeStamperCertificate-ne$null) 'Packaged launcher signature lacks a timestamp.'
  }
  Add-Content -LiteralPath $scriptTarget -Value '# tampered after signing'
  Expect-Failure {Assert-GrMetroAuthenticodeSignature -Path $scriptTarget -CertificateThumbprint $policy.SigningCertificateThumbprint -PinnedRootCertificatePath $RootCertificatePath -PinnedRootThumbprint $policy.RootCertificateThumbprint -PinnedRootSubject $policy.RootCertificateSubject -PinnedRootSha256 $policy.RootCertificateSha256} 'Tampered Authenticode content was accepted.'
  Expect-Failure {Invoke-GrMetroAuthenticodeSigning -Files @($scriptTarget) -CertificateThumbprint ('0'*40) -TimestampUrl $policy.TimestampUrl -RequireAuthenticode} 'Unknown signing certificate was accepted.'
  Expect-Failure {Assert-GrMetroCodeSigningCertificate -Certificate $certificate -MinimumValidityDays 2000 -ExpectedSubject $policy.SigningCertificateSubject} 'Near-expiry policy failure was not enforced.'
  Write-Output 'PASS: internal certificate policy, pinned chain, SHA-256 script/EXE signing, timestamping, launcher compatibility, and tamper rejection.'
}finally{Remove-Item -LiteralPath $temporary -Recurse -Force -ErrorAction SilentlyContinue}
