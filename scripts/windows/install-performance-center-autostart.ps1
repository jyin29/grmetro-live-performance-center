param([switch]$Remove)
$ErrorActionPreference="Stop"
$root=(Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$taskName="GRMetro Live Performance Center Supervisor"
. (Join-Path $PSScriptRoot 'launch-integration.ps1')
if($Remove){
  Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue
  Write-Host "Removed $taskName." -ForegroundColor Yellow
  exit 0
}
Register-GrMetroHostAutostart $root $taskName
Write-Host "Installed $taskName." -ForegroundColor Green
Write-Host "It will start the dedicated ServiceTitan browser and backend automatically when $env:USERNAME logs into Windows."
Write-Host "The five TVs remain independent clients and do not require a dashboard window on this PC."
