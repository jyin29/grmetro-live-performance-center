param([string]$ProfilePath)
$ErrorActionPreference="Stop"
. (Join-Path $PSScriptRoot 'servicetitan-profile.ps1')
$profile=Resolve-GrMetroServiceTitanProfilePath -ExplicitPath $ProfilePath
Write-Host "Recovering dedicated ServiceTitan Edge profile..." -ForegroundColor Yellow
$processes=@(Get-CimInstance Win32_Process -Filter "Name='msedge.exe'" -ErrorAction SilentlyContinue | Where-Object { Test-GrMetroEdgeCommandLineUsesProfile ([string]$_.CommandLine) $profile })
foreach($process in $processes){
  Stop-Process -Id $process.ProcessId -Force -ErrorAction SilentlyContinue
}
Start-Sleep -Seconds 2
& (Join-Path $PSScriptRoot "launch-edge.ps1") -ProfilePath $profile
if(-not $?){throw "ServiceTitan Edge launcher did not complete successfully."}
Write-Host "Dedicated ServiceTitan Edge profile relaunched." -ForegroundColor Green
