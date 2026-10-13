param([switch]$KeepServiceTitanBrowser,[string]$ProfilePath)
$ErrorActionPreference = "Stop"
$root = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
. (Join-Path $PSScriptRoot 'servicetitan-profile.ps1')
$profile=$null
if(-not $KeepServiceTitanBrowser){$profile=Resolve-GrMetroServiceTitanProfilePath -ExplicitPath $ProfilePath}
$logs = Join-Path $root "logs"
New-Item -ItemType Directory -Force -Path $logs | Out-Null
$log = Join-Path $logs "supervisor.log"
function Log([string]$message) { Add-Content -Path $log -Value ("{0} [INFO] L0 operator-stop: {1}" -f (Get-Date).ToString("o"),$message) }

# Stop the watchdog first so it cannot immediately resurrect the backend.
$supervisors = @(Get-CimInstance Win32_Process -Filter "Name='powershell.exe'" -ErrorAction SilentlyContinue | Where-Object {
  $_.CommandLine -match 'performance-center-supervisor\.ps1|start-supervised-performance-center\.ps1'
})
foreach($process in $supervisors) { Stop-Process -Id $process.ProcessId -Force -ErrorAction SilentlyContinue }

# Stop only this project's backend Node process. Do not touch unrelated Node apps.
$backends = @(Get-CimInstance Win32_Process -Filter "Name='node.exe'" -ErrorAction SilentlyContinue | Where-Object {
  $_.CommandLine -match 'apps[\\/]backend[\\/]src[\\/]index\.js'
})
foreach($process in $backends) { Stop-Process -Id $process.ProcessId -Force -ErrorAction SilentlyContinue }

# Stop only the dedicated ServiceTitan Edge profile, never the user's normal Edge windows.
if(-not $KeepServiceTitanBrowser) {
  $edge = @(Get-CimInstance Win32_Process -Filter "Name='msedge.exe'" -ErrorAction SilentlyContinue | Where-Object { Test-GrMetroEdgeCommandLineUsesProfile ([string]$_.CommandLine) $profile })
  foreach($process in $edge) { Stop-Process -Id $process.ProcessId -Force -ErrorAction SilentlyContinue }
}

Log "Operator stopped supervisor, backend, and dedicated ServiceTitan browser. Autostart registration was left unchanged."
Write-Host "GRMetro Performance Center stopped." -ForegroundColor Green
