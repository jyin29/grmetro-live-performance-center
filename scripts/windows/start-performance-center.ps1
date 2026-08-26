param(
  [switch]$SkipBuild,
  [switch]$NoBrowser
)

$ErrorActionPreference = "Stop"
$root = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
Set-Location $root

if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw "Node.js 22 or newer is required." }
if (-not (Test-Path (Join-Path $root "node_modules"))) { throw "Dependencies are not installed. Run setup first." }
if (-not (Test-Path (Join-Path $root ".env"))) { throw "Missing .env. Run scripts\windows\setup-performance-center.ps1 first." }

& (Join-Path $PSScriptRoot "launch-edge.ps1")
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

if (-not $SkipBuild) {
  Write-Host "Building dashboard..."
  npm run build
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

# A packaged launch is always production mode. Override development-only values
# that may remain in a developer-created .env without modifying the private file.
$env:NODE_ENV = "production"
$env:MOCK_MODE = "false"
$env:ENABLE_DEVELOPMENT_ROUTES = "false"

$logDirectory = Join-Path $root "logs"
New-Item -ItemType Directory -Force -Path $logDirectory | Out-Null
$stdoutLog = Join-Path $logDirectory "launcher-backend.stdout.log"
$stderrLog = Join-Path $logDirectory "launcher-backend.stderr.log"
Remove-Item $stdoutLog,$stderrLog -Force -ErrorAction SilentlyContinue

Write-Host "Starting Live Performance Center..."
$backend = Start-Process -FilePath "node" -ArgumentList "apps/backend/src/index.js" -WorkingDirectory $root -PassThru -WindowStyle Hidden -RedirectStandardOutput $stdoutLog -RedirectStandardError $stderrLog

function Show-BackendStartupLogs {
  Write-Host ""
  Write-Host "Backend startup output:" -ForegroundColor Yellow
  if (Test-Path $stdoutLog) {
    $stdout = Get-Content $stdoutLog -ErrorAction SilentlyContinue
    if ($stdout) { $stdout | Select-Object -Last 40 | ForEach-Object { Write-Host $_ } }
  }
  if (Test-Path $stderrLog) {
    $stderr = Get-Content $stderrLog -ErrorAction SilentlyContinue
    if ($stderr) { $stderr | Select-Object -Last 40 | ForEach-Object { Write-Host $_ -ForegroundColor Red } }
  }
  Write-Host "Full logs: $stdoutLog and $stderrLog" -ForegroundColor DarkGray
}

$health = "http://127.0.0.1:3000/api/v1/health"
$deadline = (Get-Date).AddSeconds(30)
$healthy = $false
do {
  Start-Sleep -Milliseconds 500
  if ($backend.HasExited) {
    Show-BackendStartupLogs
    $exitCode = $backend.ExitCode
    if ($null -eq $exitCode) { $exitCode = "unknown" }
    throw "Backend exited during startup with code $exitCode."
  }
  try {
    Invoke-RestMethod -Uri $health -TimeoutSec 2 | Out-Null
    $healthy = $true
    break
  } catch { }
} while ((Get-Date) -lt $deadline)

if (-not $healthy) {
  Stop-Process -Id $backend.Id -Force -ErrorAction SilentlyContinue
  Show-BackendStartupLogs
  throw "Backend did not become healthy in time."
}

Write-Host "Live Performance Center is running (PID $($backend.Id))."
Write-Host "Backend logs are stored in $logDirectory."
if (-not $NoBrowser) { Start-Process "http://127.0.0.1:3000" }
Write-Host "Close this window or press Ctrl+C to stop the application."
try { Wait-Process -Id $backend.Id } finally { Stop-Process -Id $backend.Id -Force -ErrorAction SilentlyContinue }
