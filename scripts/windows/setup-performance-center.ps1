$ErrorActionPreference = "Stop"
$root = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
Set-Location $root

Write-Host "Live Performance Center setup"
Write-Host "-----------------------------"

if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw "Install Node.js 22 or newer, then run this setup again." }
$major = [int]((node --version).TrimStart('v').Split('.')[0])
if ($major -lt 22) { throw "Node.js 22 or newer is required. Found $(node --version)." }

if (-not (Test-Path ".env")) {
  Copy-Item ".env.example" ".env"
  Write-Host "Created .env from .env.example."
  Write-Host "IMPORTANT: Open .env and fill in SERVICETITAN_BUSINESS_UNIT_IDS and SERVICETITAN_TECHNICIANS_JSON."
} else {
  Write-Host ".env already exists; leaving it unchanged."
}

$dependenciesReady = $false
if (Test-Path "node_modules") {
  Write-Host "Checking existing dependencies..."
  npm ls --depth=0 --silent *> $null
  if ($LASTEXITCODE -eq 0) {
    $dependenciesReady = $true
    Write-Host "Existing dependencies are valid; skipping reinstall."
  } else {
    Write-Host "Existing dependencies need repair."
  }
}

if (-not $dependenciesReady) {
  Write-Host "Installing dependencies..."
  npm ci
  if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "Dependency installation failed. If Windows reports EPERM/unlink for esbuild.exe," -ForegroundColor Yellow
    Write-Host "close any running Vite/dashboard development terminals and run setup again." -ForegroundColor Yellow
    exit $LASTEXITCODE
  }
}

# qrcode-terminal is local Windows deployment tooling. PowerShell's Stop error policy
# must not turn Node's expected "module missing" stderr into a terminating setup error.
$qrRendererReady = Test-Path (Join-Path $root "node_modules\qrcode-terminal\package.json")
if (-not $qrRendererReady) {
  Write-Host "Installing local QR renderer..."
  npm install --no-save --no-package-lock qrcode-terminal@0.12.0
  if ($LASTEXITCODE -ne 0) { throw "Could not install the local QR renderer." }
  $qrRendererReady = Test-Path (Join-Path $root "node_modules\qrcode-terminal\package.json")
  if (-not $qrRendererReady) { throw "QR renderer installation completed but the module could not be found." }
} else {
  Write-Host "QR renderer is ready."
}

Write-Host "Building dashboard..."
npm run build
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Running tests..."
npm test
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Setup complete."
Write-Host "1. Make sure .env contains your private ServiceTitan configuration."
Write-Host "2. Run scripts\windows\start-performance-center.ps1"
Write-Host "3. Sign into ServiceTitan in the dedicated Edge window when needed."
