$ErrorActionPreference="Stop"
$root=(Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
Set-Location $root
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot "build-launcher-exe.ps1")
if($LASTEXITCODE -ne 0){throw "Could not build launcher EXE."}
$out=Join-Path $root "dist\windows-installer";New-Item -ItemType Directory -Force -Path $out|Out-Null
$stage=Join-Path $env:TEMP ("grmetro-package-"+[guid]::NewGuid().ToString());New-Item -ItemType Directory -Force -Path $stage|Out-Null
try{
  $exclude=@('.git','node_modules','logs','dist','.env')
  Get-ChildItem $root -Force|Where-Object{$exclude -notcontains $_.Name}|ForEach-Object{Copy-Item $_.FullName -Destination $stage -Recurse -Force}
  $zip=Join-Path $out "grmetro-performance-center-package.zip";if(Test-Path $zip){Remove-Item $zip -Force};Compress-Archive -Path (Join-Path $stage '*') -DestinationPath $zip -CompressionLevel Optimal
  $bootstrap=Join-Path $out "install-grmetro-performance-center.ps1";Copy-Item (Join-Path $PSScriptRoot "install-grmetro-performance-center.ps1") $bootstrap -Force
  $cmd=Join-Path $out "install.cmd";Set-Content $cmd '@echo off
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0install-grmetro-performance-center.ps1" -PackageZip "%~dp0grmetro-performance-center-package.zip"
' -Encoding ASCII
  $iexpress="$env:WINDIR\System32\iexpress.exe"
  if(-not(Test-Path $iexpress)){Write-Host "IExpress is unavailable; portable installer files are in $out" -ForegroundColor Yellow;exit 0}
  $sed=Join-Path $out "grmetro-installer.sed";$setupExe=Join-Path $out "GRMetro Performance Center Setup.exe"
  $lines=@('[Version]','Class=IEXPRESS','SEDVersion=3','[Options]','PackagePurpose=InstallApp','ShowInstallProgramWindow=0','HideExtractAnimation=1','UseLongFileName=1','InsideCompressed=0','CAB_FixedSize=0','CAB_ResvCodeSigning=0','RebootMode=N','InstallPrompt=','DisplayLicense=','FinishMessage=','TargetName='+$setupExe,'FriendlyName=GRMetro Performance Center Setup','AppLaunched=install.cmd','PostInstallCmd=<None>','AdminQuietInstCmd=install.cmd','UserQuietInstCmd=install.cmd','SourceFiles=SourceFiles','[SourceFiles]','SourceFiles0='+$out+'\','[SourceFiles0]','%FILE0%=','%FILE1%=','%FILE2%=','[Strings]','FILE0=install.cmd','FILE1=install-grmetro-performance-center.ps1','FILE2=grmetro-performance-center-package.zip')
  Set-Content $sed $lines -Encoding ASCII
  & $iexpress /N /Q $sed
  if(Test-Path $setupExe){Write-Host "Built $setupExe" -ForegroundColor Green}else{Write-Host "Installer payload built in $out; IExpress did not emit the EXE." -ForegroundColor Yellow}
}finally{Remove-Item $stage -Recurse -Force -ErrorAction SilentlyContinue}
