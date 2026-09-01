param(
  [switch]$NoBrowserRecovery
)

$ErrorActionPreference = "Stop"
$root = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$logs = Join-Path $root "logs"
New-Item -ItemType Directory -Force -Path $logs | Out-Null
$supervisorLog = Join-Path $logs "supervisor.log"
$stdoutLog = Join-Path $logs "launcher-backend.stdout.log"
$stderrLog = Join-Path $logs "launcher-backend.stderr.log"
$healthUrl = "http://127.0.0.1:3000/api/v1/health"
$adminUrl = "http://127.0.0.1:3000/api/v1/admin"
$backendScript = Join-Path $root "apps\backend\src\index.js"
$edgeRecovery = Join-Path $PSScriptRoot "restart-servicetitan-edge.ps1"
$script:backend = $null
$script:restartHistory = @()
$script:healthFailures = 0
$script:recoveryLevel = 0
$script:serviceTitanFailures = 0
$script:lastFullRecovery = [DateTime]::MinValue
$script:lastInterventionLog = [DateTime]::MinValue

function Write-SupervisorLog([string]$Event,[string]$Message,[string]$Severity="INFO") {
  $line = "{0} [{1}] L{2} {3}: {4}" -f (Get-Date).ToString("o"),$Severity,$script:recoveryLevel,$Event,$Message
  Add-Content -Path $supervisorLog -Value $line
  $color = if($Severity -eq "ERROR"){"Red"}elseif($Severity -eq "WARN"){"Yellow"}elseif($Severity -eq "RECOVERED"){"Green"}else{"DarkGray"}
  Write-Host $line -ForegroundColor $color
}
function Test-BackendHealth { try { Invoke-RestMethod -Uri $healthUrl -TimeoutSec 3 | Out-Null; return $true } catch { return $false } }
function Get-AdminHealth { try { return Invoke-RestMethod -Uri $adminUrl -TimeoutSec 4 } catch { return $null } }
function Start-Backend {
  if($script:backend -and -not $script:backend.HasExited){ return $script:backend }
  $env:NODE_ENV="production"; $env:MOCK_MODE="false"; $env:ENABLE_DEVELOPMENT_ROUTES="false"; $env:HOST="0.0.0.0"
  $script:backend = Start-Process -FilePath "node" -ArgumentList "apps/backend/src/index.js" -WorkingDirectory $root -PassThru -WindowStyle Hidden -RedirectStandardOutput $stdoutLog -RedirectStandardError $stderrLog
  Write-SupervisorLog "backend-start" "Started backend PID $($script:backend.Id)."
  return $script:backend
}
function Stop-Backend {
  if($script:backend -and -not $script:backend.HasExited){ Write-SupervisorLog "backend-stop" "Stopping backend PID $($script:backend.Id)." "WARN"; Stop-Process -Id $script:backend.Id -Force -ErrorAction SilentlyContinue; try { Wait-Process -Id $script:backend.Id -Timeout 5 -ErrorAction SilentlyContinue } catch {} }
  $script:backend=$null
}
function Wait-Healthy([int]$Seconds=30) { $deadline=(Get-Date).AddSeconds($Seconds); do { if(Test-BackendHealth){return $true}; if($script:backend -and $script:backend.HasExited){return $false}; Start-Sleep -Seconds 1 } while((Get-Date)-lt $deadline); return $false }
function Register-Restart { $cutoff=(Get-Date).AddMinutes(-10); $script:restartHistory=@($script:restartHistory|Where-Object{$_ -gt $cutoff}) + (Get-Date); return $script:restartHistory.Count }
function Restart-BackendSafely([string]$Reason) {
  $script:recoveryLevel=2; $count=Register-Restart
  if($count -gt 5){ Write-SupervisorLog "restart-loop-protected" "More than 5 backend restarts occurred within 10 minutes. Escalating instead of looping." "ERROR"; return $false }
  Write-SupervisorLog "backend-recovery" "Restart requested: $Reason (restart $count/5 in current window)." "WARN"
  Stop-Backend; Start-Sleep -Seconds 2; Start-Backend | Out-Null
  if(Wait-Healthy 30){ Write-SupervisorLog "backend-recovered" "Backend health endpoint recovered." "RECOVERED"; $script:healthFailures=0; $script:recoveryLevel=0; return $true }
  Write-SupervisorLog "backend-recovery-failed" "Backend failed to become healthy after restart." "ERROR"; return $false
}
function Restart-ServiceTitanBrowser([string]$Reason) {
  if($NoBrowserRecovery){return $false}
  $script:recoveryLevel=4; Write-SupervisorLog "browser-recovery" "Controlled dedicated ServiceTitan Edge recovery: $Reason" "WARN"
  try {
    if(-not(Test-Path $edgeRecovery)){throw "Missing browser recovery helper: $edgeRecovery"}
    & $edgeRecovery
    if($LASTEXITCODE -ne 0){throw "Edge recovery helper exited $LASTEXITCODE"}
    Start-Sleep -Seconds 8
    Write-SupervisorLog "browser-relaunched" "Dedicated ServiceTitan Edge profile was relaunched without touching unrelated Edge profiles." "RECOVERED"; return $true
  } catch { Write-SupervisorLog "browser-recovery-failed" $_.Exception.Message "ERROR"; return $false }
}
function Invoke-FullRecovery([string]$Reason) {
  $script:recoveryLevel=5
  if(((Get-Date)-$script:lastFullRecovery).TotalMinutes -lt 10){ Write-SupervisorLog "full-recovery-loop-protected" "A full recovery already ran within 10 minutes. Intervention is required." "ERROR"; $script:recoveryLevel=6; return $false }
  $script:lastFullRecovery=Get-Date; Write-SupervisorLog "full-recovery" $Reason "WARN"; Stop-Backend
  if(-not $NoBrowserRecovery){ [void](Restart-ServiceTitanBrowser "Full stack recovery") }
  Start-Sleep -Seconds 3; Start-Backend | Out-Null
  if(Wait-Healthy 30){ Write-SupervisorLog "full-recovery-complete" "Application stack recovered." "RECOVERED"; $script:recoveryLevel=0; return $true }
  Write-SupervisorLog "intervention-required" "Full recovery failed. Preserve logs and check ServiceTitan authentication/backend startup errors." "ERROR"; $script:recoveryLevel=6; return $false
}
function Test-ServiceTitanAuthentication($admin) {
  if(-not $admin){return "unknown"}
  $st=$admin.diagnostics.serviceTitan; $browser=$admin.diagnostics.browser
  $text=(($st|ConvertTo-Json -Compress -Depth 5)+" "+($browser|ConvertTo-Json -Compress -Depth 5)).ToLowerInvariant()
  if($text -match "login|sign.in|auth.*required|unauthorized|forbidden|session.*expired"){return "login-required"}

  # The ServiceTitan client reports the healthy state as "connected" while the
  # diagnostics subsystem historically used "healthy". Treat both as healthy.
  # Requiring only the literal word "healthy" caused the supervisor to restart
  # a perfectly working backend and Edge session forever.
  $serviceTitanStatus = [string]$st.status
  $subsystemStatus = [string]$admin.diagnostics.subsystems.servicetitan
  $browserReady = ($browser.connected -eq $true -and $browser.serviceTitanPageFound -eq $true)
  if(($serviceTitanStatus -eq "connected" -or $subsystemStatus -eq "healthy" -or $subsystemStatus -eq "connected") -and $browserReady){return "healthy"}

  return "degraded"
}

Write-SupervisorLog "supervisor-start" "Windows supervisor started. Central PC hosts backend/ServiceTitan; TVs independently load permanent display URLs."
Start-Backend | Out-Null
if(-not (Wait-Healthy 30)){ if(-not (Restart-BackendSafely "Initial startup health check failed")){ [void](Invoke-FullRecovery "Initial backend startup failed twice") } }
try {
  while($true){
    Start-Sleep -Seconds 5
    if($script:backend -and $script:backend.HasExited){ Write-SupervisorLog "backend-process-exited" "Backend process exited with code $($script:backend.ExitCode)." "ERROR"; if(-not (Restart-BackendSafely "Process exited")){ [void](Invoke-FullRecovery "Backend repeatedly exited") }; continue }
    if(-not (Test-BackendHealth)){ $script:healthFailures += 1; $script:recoveryLevel=1; Write-SupervisorLog "health-miss" "Backend health check failed ($($script:healthFailures)/3 before restart)." "WARN"; if($script:healthFailures -ge 3){ if(-not (Restart-BackendSafely "Three consecutive health failures")){ [void](Invoke-FullRecovery "Backend health remained unavailable") } }; continue }
    if($script:healthFailures -gt 0){Write-SupervisorLog "health-recovered" "Backend recovered without process restart." "RECOVERED"}; $script:healthFailures=0
    $admin=Get-AdminHealth; $auth=Test-ServiceTitanAuthentication $admin
    if($auth -eq "login-required"){
      $script:recoveryLevel=6
      if(((Get-Date)-$script:lastInterventionLog).TotalMinutes -ge 5){ Write-SupervisorLog "intervention-required" "ServiceTitan authentication/login is required. Destructive recovery is suspended; log in using the dedicated Edge profile." "ERROR"; $script:lastInterventionLog=Get-Date }
      Start-Sleep -Seconds 30; continue
    }
    if($auth -eq "degraded"){
      $script:serviceTitanFailures += 1; Write-SupervisorLog "servicetitan-degraded" "ServiceTitan/browser diagnostics degraded ($($script:serviceTitanFailures)/6)." "WARN"
      if($script:serviceTitanFailures -eq 3){ $script:recoveryLevel=3; [void](Restart-BackendSafely "ServiceTitan connection remained degraded") }
      elseif($script:serviceTitanFailures -ge 6){ if(Restart-ServiceTitanBrowser "ServiceTitan remained degraded after backend recovery"){ $script:serviceTitanFailures=0 } else { [void](Invoke-FullRecovery "ServiceTitan browser recovery failed") } }
    } else { if($script:serviceTitanFailures -gt 0){Write-SupervisorLog "servicetitan-recovered" "ServiceTitan diagnostics returned healthy." "RECOVERED"}; $script:serviceTitanFailures=0; $script:recoveryLevel=0 }
  }
} finally { Write-SupervisorLog "supervisor-stop" "Supervisor is shutting down; stopping owned backend process." "WARN"; Stop-Backend }
