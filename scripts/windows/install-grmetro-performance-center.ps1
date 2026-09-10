param([string]$PackageZip)
$ErrorActionPreference="Stop"
Add-Type -AssemblyName System.Windows.Forms
$installRoot=Join-Path $env:LOCALAPPDATA "GRMetro\Performance Center"
if(-not$PackageZip){$PackageZip=Join-Path $PSScriptRoot "grmetro-performance-center-package.zip"}
if(-not(Test-Path $PackageZip)){throw "Installer package is missing: $PackageZip"}
$existingEnv=Join-Path $installRoot ".env"
$envBackup=$null
if(Test-Path $existingEnv){$envBackup=Join-Path $env:TEMP ("grmetro-existing-env-"+[guid]::NewGuid().ToString()+".bak");Copy-Item $existingEnv $envBackup}
New-Item -ItemType Directory -Force -Path $installRoot|Out-Null
Get-ChildItem $installRoot -Force -ErrorAction SilentlyContinue|Where-Object{$_.Name -ne '.env'}|Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
Expand-Archive -Path $PackageZip -DestinationPath $installRoot -Force
if($envBackup){Copy-Item $envBackup $existingEnv -Force;Remove-Item $envBackup -Force -ErrorAction SilentlyContinue}
$wizard=Join-Path $installRoot "scripts\windows\env-wizard.ps1"
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $wizard
if($LASTEXITCODE -eq 2){[System.Windows.Forms.MessageBox]::Show("Setup was cancelled. You can run GRMetro Performance Center later to continue.","GRMetro Setup")|Out-Null;exit 0}
if($LASTEXITCODE -ne 0){throw "Configuration wizard failed."}
$setup=Join-Path $installRoot "scripts\windows\setup-performance-center.ps1"
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $setup -SkipWizard
if($LASTEXITCODE -ne 0){throw "GRMetro setup failed. See the setup window for details."}
$exe=Join-Path $installRoot "GRMetro Performance Center.exe"
if(-not(Test-Path $exe)){& powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $installRoot "scripts\windows\build-launcher-exe.ps1")}
$shell=New-Object -ComObject WScript.Shell
$desktop=[Environment]::GetFolderPath("Desktop")
$startMenu=Join-Path $env:APPDATA "Microsoft\Windows\Start Menu\Programs\GRMetro"
New-Item -ItemType Directory -Force -Path $startMenu|Out-Null
foreach($path in @((Join-Path $desktop "GRMetro Performance Center.lnk"),(Join-Path $startMenu "GRMetro Performance Center.lnk"))){$lnk=$shell.CreateShortcut($path);$lnk.TargetPath=$exe;$lnk.WorkingDirectory=$installRoot;$lnk.Description="GRMetro Live Performance Center";if(Test-Path $exe){$lnk.IconLocation="$exe,0"};$lnk.Save()}
$choice=Join-Path $installRoot ".grmetro-autostart-choice"
if((Test-Path $choice)-and((Get-Content $choice -Raw).Trim()-eq"yes")){& powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $installRoot "scripts\windows\install-performance-center-autostart.ps1")}
[System.Windows.Forms.MessageBox]::Show("GRMetro Performance Center is installed and ready.","GRMetro Setup",[System.Windows.Forms.MessageBoxButtons]::OK,[System.Windows.Forms.MessageBoxIcon]::Information)|Out-Null
Start-Process $exe
