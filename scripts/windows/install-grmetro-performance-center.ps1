param([string]$PackageZip)
$ErrorActionPreference="Stop"
Add-Type -AssemblyName System.Windows.Forms
try {
  $installRoot=Join-Path $env:LOCALAPPDATA "GRMetro\Performance Center"
  if(-not$PackageZip){$PackageZip=Join-Path $PSScriptRoot "grmetro-performance-center-package.zip"}
  if(-not(Test-Path $PackageZip)){throw "Installer package is missing: $PackageZip"}
  . (Join-Path $PSScriptRoot 'package-files.ps1')
  Install-GrMetroPackageFiles -PackageZip $PackageZip -InstallRoot $installRoot
  $wizard=Join-Path $installRoot "scripts\windows\env-wizard.ps1"
  & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $wizard
  if($LASTEXITCODE -eq 2){[System.Windows.Forms.MessageBox]::Show("Setup was cancelled. You can run GRMetro Performance Center later to continue.","GRMetro Setup")|Out-Null;exit 0}
  if($LASTEXITCODE -ne 0){throw "Configuration wizard failed (exit code $LASTEXITCODE)."}
  $setup=Join-Path $installRoot "scripts\windows\setup-performance-center.ps1"
  $setupOutput=@(& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $setup -SkipWizard 2>&1)
  $setupExitCode=$LASTEXITCODE
  if($setupExitCode -ne 0){
    $detail=($setupOutput|Select-Object -Last 8|Out-String).Trim()
    if(-not$detail){$detail="No additional setup output was available."}
    throw "GRMetro setup failed (exit code $setupExitCode).`n`n$detail"
  }
  $exe=Join-Path $installRoot "GRMetro Performance Center.exe"
  if(-not(Test-Path $exe)){& powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $installRoot "scripts\windows\build-launcher-exe.ps1")}
  $shell=New-Object -ComObject WScript.Shell
  $desktop=[Environment]::GetFolderPath("Desktop");$startMenu=Join-Path $env:APPDATA "Microsoft\Windows\Start Menu\Programs\GRMetro"
  New-Item -ItemType Directory -Force -Path $startMenu|Out-Null
  foreach($path in @((Join-Path $desktop "GRMetro Performance Center.lnk"),(Join-Path $startMenu "GRMetro Performance Center.lnk"))){$lnk=$shell.CreateShortcut($path);$lnk.TargetPath=$exe;$lnk.WorkingDirectory=$installRoot;$lnk.Description="GRMetro Live Performance Center";if(Test-Path $exe){$lnk.IconLocation="$exe,0"};$lnk.Save()}
  $choice=Join-Path $installRoot ".grmetro-autostart-choice"
  if((Test-Path $choice)-and((Get-Content $choice -Raw).Trim()-eq"yes")){& powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $installRoot "scripts\windows\install-performance-center-autostart.ps1")}
  # Keep implementation files out of the normal day-to-day view without changing their paths.
  foreach($internal in @((Join-Path $installRoot "scripts"),(Join-Path $installRoot ".env"),(Join-Path $installRoot ".grmetro-autostart-choice"))){if(Test-Path $internal){try{(Get-Item $internal -Force).Attributes=(Get-Item $internal -Force).Attributes -bor [IO.FileAttributes]::Hidden}catch{}}}
  [System.Windows.Forms.MessageBox]::Show("GRMetro Performance Center is installed and ready. Use the Desktop or Start Menu shortcut from now on.","GRMetro Setup",[System.Windows.Forms.MessageBoxButtons]::OK,[System.Windows.Forms.MessageBoxIcon]::Information)|Out-Null
  Start-Process $exe
}catch{
  $message="GRMetro Performance Center could not be installed.`n`n$($_.Exception.Message)`n`nNo autostart task was created. Correct the problem, then run Setup again."
  [System.Windows.Forms.MessageBox]::Show($message,"GRMetro Setup Failed",[System.Windows.Forms.MessageBoxButtons]::OK,[System.Windows.Forms.MessageBoxIcon]::Error)|Out-Null
  exit 1
}
