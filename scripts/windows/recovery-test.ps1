param(
  [ValidateSet("status","refresh","display-ack","backend-restart","browser-restart")]
  [string]$Test="status",
  [string]$DisplayId="main-office"
)
$ErrorActionPreference="Stop"
$root=(Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$health="http://127.0.0.1:3000/api/v1/health"
$admin="http://127.0.0.1:3000/api/v1/admin"
$refresh="http://127.0.0.1:3000/api/v1/management/refresh"
$presentation="http://127.0.0.1:3000/api/v1/presentation/$DisplayId"
$control=Join-Path $PSScriptRoot "supervisor-control.ps1"
function Wait-Healthy([int]$seconds=45){$deadline=(Get-Date).AddSeconds($seconds);do{try{$h=Invoke-RestMethod $health -TimeoutSec 3;if($h.status-eq"ok"-and$h.backend-eq"running"){return $true}}catch{};Start-Sleep 1}while((Get-Date)-lt$deadline);return $false}
Write-Host "`nGRMetro Recovery Test Mode" -ForegroundColor Cyan
Write-Host "Safe validation only; no synthetic ServiceTitan requests or credential changes.`n" -ForegroundColor DarkGray
switch($Test){
 "status" { Invoke-RestMethod $admin -TimeoutSec 5 | ConvertTo-Json -Depth 8 }
 "refresh" { try{Invoke-RestMethod -Method Post $refresh -TimeoutSec 90|ConvertTo-Json -Depth 5}catch{Write-Host "Refresh failed as expected if ServiceTitan is degraded: $($_.Exception.Message)" -ForegroundColor Yellow};if(-not(Wait-Healthy 10)){throw "Backend became unhealthy during refresh test."};Write-Host "PASS: backend remained healthy through refresh attempt." -ForegroundColor Green }
 "display-ack" { $p=Invoke-RestMethod $presentation -TimeoutSec 5;Write-Host "Display: $DisplayId";Write-Host "Online: $($p.online)";Write-Host "Target revision: $($p.state.revision)";Write-Host "Applied revision: $($p.appliedRevision)";if($p.online-and$p.applied){Write-Host "PASS: physical display has acknowledged current state." -ForegroundColor Green}else{Write-Host "WAITING: display is offline or has not acknowledged current revision." -ForegroundColor Yellow} }
 "backend-restart" { $answer=Read-Host "This intentionally restarts the backend to verify supervisor recovery. Type TEST to continue";if($answer-cne"TEST"){Write-Host "Cancelled.";exit}; & $control restart-backend;if(Wait-Healthy 60){Write-Host "PASS: backend recovered." -ForegroundColor Green}else{throw "FAIL: backend did not recover within 60 seconds."} }
 "browser-restart" { $answer=Read-Host "This intentionally restarts ONLY the dedicated ServiceTitan Edge profile. Type TEST to continue";if($answer-cne"TEST"){Write-Host "Cancelled.";exit}; & $control restart-browser;Start-Sleep 10;if(Wait-Healthy 30){Write-Host "PASS: backend stayed/recovered healthy. Check admin diagnostics for ServiceTitan page lock/token recovery." -ForegroundColor Green}else{throw "FAIL: backend health did not recover."} }
}
