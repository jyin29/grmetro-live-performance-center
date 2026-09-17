param([switch]$SkipWizard)
$ErrorActionPreference = "Stop"
$root = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
Set-Location $root

Write-Host "GRMetro Performance Center setup"
Write-Host "--------------------------------"

if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw "Install Node.js 22 or newer, then run this setup again." }
$major = [int]((node --version).TrimStart('v').Split('.')[0])
if ($major -lt 22) { throw "Node.js 22 or newer is required. Found $(node --version)." }

if (-not (Test-Path ".env")) { Copy-Item ".env.example" ".env" }
if(-not $SkipWizard){
  $wizard=Join-Path $PSScriptRoot "env-wizard.ps1"
  if(Test-Path $wizard){& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $wizard;if($LASTEXITCODE -eq 2){Write-Host "Setup cancelled.";exit 2};if($LASTEXITCODE -ne 0){throw "Configuration wizard failed."}}
}

$dependenciesReady = $false
if (Test-Path "node_modules") { npm ls --depth=0 --silent *> $null; if ($LASTEXITCODE -eq 0) { $dependenciesReady = $true } }
if (-not $dependenciesReady) { Write-Host "Installing dependencies..." -ForegroundColor Cyan; npm ci; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE } }
$qrRendererReady = Test-Path (Join-Path $root "node_modules\qrcode-terminal\package.json")
if (-not $qrRendererReady) { npm install --no-save --no-package-lock qrcode-terminal@0.12.0; if ($LASTEXITCODE -ne 0) { throw "Could not install the local QR renderer." } }
Write-Host "Building dashboard..." -ForegroundColor Cyan
npm run build; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
Write-Host "Running tests..." -ForegroundColor Cyan
npm test; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
$buildExe=Join-Path $PSScriptRoot "build-launcher-exe.ps1";if(Test-Path $buildExe){try{& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $buildExe}catch{Write-Host "Launcher EXE could not be built; the .cmd launcher remains available." -ForegroundColor Yellow}}
$choice=Join-Path $root ".grmetro-autostart-choice"
if((Test-Path $choice)-and((Get-Content $choice -Raw).Trim()-eq"yes")){$autostart=Join-Path $PSScriptRoot "install-performance-center-autostart.ps1";try{& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $autostart}catch{Write-Host "Autostart could not be installed automatically." -ForegroundColor Yellow}}
Write-Host "Setup complete." -ForegroundColor Green
