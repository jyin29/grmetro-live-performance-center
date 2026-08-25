param(
  [switch]$SkipBuild,
  [switch]$NoBrowser
)

$ErrorActionPreference = "Stop"
$root = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
Set-Location $root

if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw "Node.js 22 or newer is required." }
if (-not (Test-Path (Join-Path $root "node_modules"))) { throw "Dependencies are not installed. Run npm install first." }
if (-not (Test-Path (Join-Path $root ".env"))) { throw "Missing .env. Run scripts\windows\setup-performance-center.ps1 first." }

& (Join-Path $PSScriptRoot "launch-edge.ps1")
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

if (-not $SkipBuild) {
  Write-Host "Building dashboard..."
  npm run build
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

$env:NODE_ENV = "production"
Write-Host "Starting Live Performance Center..."
$backend = Start-Process -FilePath "node" -ArgumentList "apps/backend/src/index.js" -WorkingDirectory $root -PassThru -WindowStyle Hidden

$health = "http://127.0.0.1:3000/api/v1/health"
$deadline = (Get-Date).AddSeconds(30)
do {
  Start-Sleep -Milliseconds 500
  if ($backend.HasExited) { throw "Backend exited during startup with code $($backend.ExitCode)." }
  try { Invoke-RestMethod -Uri $health -TimeoutSec 2 | Out-Null; break } catch { }
} while ((Get-Date) -lt $deadline)

if ((Get-Date) -ge $deadline) { Stop-Process -Id $backend.Id -Force -ErrorAction SilentlyContinue; throw "Backend did not become healthy in time." }

Write-Host "Live Performance Center is running (PID $($backend.Id))."
if (-not $NoBrowser) { Start-Process "http://127.0.0.1:3000" }
Write-Host "Close this window or press Ctrl+C to stop the application."
try { Wait-Process -Id $backend.Id } finally { Stop-Process -Id $backend.Id -Force -ErrorAction SilentlyContinue }
