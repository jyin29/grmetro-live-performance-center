param(
  [ValidateSet("help","status","refresh-data","restart-backend","restart-browser","full-recovery","logs","supervisor-status","install-autostart","remove-autostart")]
  [string]$Command="help"
)
$ErrorActionPreference="Stop"
$root=(Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$control=Join-Path $PSScriptRoot "supervisor-control.ps1"
$autostart=Join-Path $PSScriptRoot "install-performance-center-autostart.ps1"
$health="http://127.0.0.1:3000/api/v1/health"
$admin="http://127.0.0.1:3000/api/v1/admin"
$refresh="http://127.0.0.1:3000/api/v1/management/refresh"
function Header { Write-Host "`nGRMetro Central Admin" -ForegroundColor Cyan; Write-Host "Local emergency controls for the backend PC only.`n" -ForegroundColor DarkGray }
function Confirm-Danger([string]$message){$answer=Read-Host "$message Type YES to continue";return $answer -ceq "YES"}
Header
switch($Command){
 "help" { Write-Host "Commands:"; Write-Host "  status              System/backend diagnostics"; Write-Host "  refresh-data        Force dashboard data refresh"; Write-Host "  restart-backend     Stop backend; supervisor restores it"; Write-Host "  restart-browser     Restart dedicated ServiceTitan Edge profile"; Write-Host "  full-recovery       Restart backend + dedicated ServiceTitan Edge"; Write-Host "  logs                Open application logs"; Write-Host "  supervisor-status   Show backend/supervisor status"; Write-Host "  install-autostart   Install supervisor Windows logon task"; Write-Host "  remove-autostart    Remove supervisor Windows logon task" }
 "status" { try{$a=Invoke-RestMethod $admin -TimeoutSec 5; $a|ConvertTo-Json -Depth 7}catch{Write-Host "Backend unavailable: $($_.Exception.Message)" -ForegroundColor Red} }
 "refresh-data" { try{Invoke-RestMethod -Method Post -Uri $refresh -TimeoutSec 60|ConvertTo-Json -Depth 5;Write-Host "Refresh requested." -ForegroundColor Green}catch{Write-Host "Refresh failed: $($_.Exception.Message)" -ForegroundColor Red} }
 "restart-backend" { if(Confirm-Danger "Restart the GRMetro backend?"){& $control restart-backend}else{Write-Host "Cancelled."} }
 "restart-browser" { if(Confirm-Danger "Restart the dedicated ServiceTitan Edge session?"){& $control restart-browser}else{Write-Host "Cancelled."} }
 "full-recovery" { if(Confirm-Danger "Run FULL recovery? This restarts the backend and dedicated ServiceTitan Edge session."){& $control full-recovery}else{Write-Host "Cancelled."} }
 "logs" { & $control logs }
 "supervisor-status" { & $control status }
 "install-autostart" { & $autostart }
 "remove-autostart" { if(Confirm-Danger "Remove automatic supervisor startup?"){& $autostart -Remove}else{Write-Host "Cancelled."} }
}
