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

Write-Host "Installing dependencies..."
npm ci
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

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
