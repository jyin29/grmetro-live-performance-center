param(
  [ValidateSet("status","restart-backend","restart-browser","full-recovery","logs")]
  [string]$Action="status"
)
$ErrorActionPreference="Stop"
$root=(Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$logs=Join-Path $root "logs"
function Backend-Health { try { Invoke-RestMethod "http://127.0.0.1:3000/api/v1/health" -TimeoutSec 3 | Out-Null; return $true } catch { return $false } }
function Backend-Processes { @(Get-CimInstance Win32_Process -Filter "Name='node.exe'" -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like "*apps/backend/src/index.js*" }) }
switch($Action){
  "status" {
    $processes=Backend-Processes
    Write-Host "GRMetro Live Performance Center" -ForegroundColor Cyan
    Write-Host ("Backend health: {0}" -f $(if(Backend-Health){"HEALTHY"}else{"OFFLINE"}))
    Write-Host ("Backend processes: {0}" -f $processes.Count)
    $task=Get-ScheduledTask -TaskName "GRMetro Live Performance Center Supervisor" -ErrorAction SilentlyContinue
    Write-Host ("Supervisor autostart: {0}" -f $(if($task){$task.State}else{"Not installed"}))
  }
  "restart-backend" {
    Backend-Processes | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
    Write-Host "Stopped backend. The supervisor will detect this and rebuild the backend process automatically." -ForegroundColor Yellow
  }
  "restart-browser" {
    & (Join-Path $PSScriptRoot "launch-edge.ps1") -RestartExisting
  }
  "full-recovery" {
    Backend-Processes | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
    & (Join-Path $PSScriptRoot "launch-edge.ps1") -RestartExisting
    Write-Host "Requested full recovery. The supervisor will restore the backend after detecting the stopped process." -ForegroundColor Yellow
  }
  "logs" {
    New-Item -ItemType Directory -Force -Path $logs | Out-Null
    Start-Process explorer.exe $logs
  }
}
