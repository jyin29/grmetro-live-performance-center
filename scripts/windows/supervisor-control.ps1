param(
  [ValidateSet("status","restart-backend","restart-browser","full-recovery","logs")]
  [string]$Action="status"
)
$ErrorActionPreference="Stop"
$root=(Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$logs=Join-Path $root "logs"
$edgeRecovery=Join-Path $PSScriptRoot "restart-servicetitan-edge.ps1"
function Backend-Health { try { Invoke-RestMethod "http://127.0.0.1:3000/api/v1/health" -TimeoutSec 3 | Out-Null; return $true } catch { return $false } }
function Backend-Processes { @(Get-CimInstance Win32_Process -Filter "Name='node.exe'" -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like "*apps/backend/src/index.js*" }) }
function ServiceTitan-Healthy {
  try {
    $admin=Invoke-RestMethod "http://127.0.0.1:3000/api/v1/admin" -TimeoutSec 3
    return $admin.diagnostics.serviceTitan.status -eq 'connected' -and $admin.diagnostics.browser.connected -and $admin.diagnostics.browser.serviceTitanPageFound
  } catch { return $false }
}
function Wait-GrMetroCondition([scriptblock]$Condition,[int]$TimeoutSeconds,[string]$FailureMessage) {
  $deadline=(Get-Date).AddSeconds($TimeoutSeconds)
  do { if(& $Condition){return};Start-Sleep -Milliseconds 750 } while((Get-Date)-lt $deadline)
  throw $FailureMessage
}
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
    Wait-GrMetroCondition { Backend-Health } 45 "Backend did not return healthy within 45 seconds."
    Write-Host "Backend restarted and health check passed." -ForegroundColor Green
  }
  "restart-browser" {
    & $edgeRecovery
    Wait-GrMetroCondition { ServiceTitan-Healthy } 45 "ServiceTitan did not reconnect within 45 seconds. Open the dedicated Edge window and confirm the session is signed in."
    Write-Host "ServiceTitan restarted and connection verified." -ForegroundColor Green
  }
  "full-recovery" {
    Backend-Processes | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
    & $edgeRecovery
    Write-Host "Requested full recovery. The supervisor will restore the backend after detecting the stopped process." -ForegroundColor Yellow
  }
  "logs" { New-Item -ItemType Directory -Force -Path $logs | Out-Null; Start-Process explorer.exe -ArgumentList ('"{0}"' -f $logs) }
}
