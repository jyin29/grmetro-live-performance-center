param([switch]$SkipBuild)
$ErrorActionPreference="Stop"
$root=(Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
Set-Location $root
if(-not(Get-Command node -ErrorAction SilentlyContinue)){throw "Node.js 22 or newer is required."}
if(-not(Test-Path (Join-Path $root "node_modules"))){throw "Dependencies are not installed. Run setup first."}
if(-not(Test-Path (Join-Path $root ".env"))){throw "Missing .env. Run setup-performance-center.ps1 first."}
if(-not $SkipBuild){Write-Host "Building dashboard..." -ForegroundColor Cyan; npm run build; if($LASTEXITCODE -ne 0){throw "Dashboard build failed."}}
Write-Host "Starting ServiceTitan browser..." -ForegroundColor Cyan
& (Join-Path $PSScriptRoot "launch-edge.ps1")
if($LASTEXITCODE -ne 0){throw "ServiceTitan browser launcher failed."}
Write-Host "Starting self-healing supervisor..." -ForegroundColor Cyan
Write-Host "Final deployment mode: this PC does NOT open a dashboard display." -ForegroundColor DarkGray
Write-Host "Each Google TV independently loads its permanent /?display=<id> URL." -ForegroundColor DarkGray
& (Join-Path $PSScriptRoot "performance-center-supervisor.ps1")
