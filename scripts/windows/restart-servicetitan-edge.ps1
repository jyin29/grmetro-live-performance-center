$ErrorActionPreference="Stop"
$profile="C:\edge-dashboard-profile"
Write-Host "Recovering dedicated ServiceTitan Edge profile..." -ForegroundColor Yellow
$processes=@(Get-CimInstance Win32_Process -Filter "Name='msedge.exe'" -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like "*$profile*" })
foreach($process in $processes){
  Stop-Process -Id $process.ProcessId -Force -ErrorAction SilentlyContinue
}
Start-Sleep -Seconds 2
& (Join-Path $PSScriptRoot "launch-edge.ps1")
if($LASTEXITCODE -ne 0){throw "ServiceTitan Edge launcher failed with exit code $LASTEXITCODE."}
Write-Host "Dedicated ServiceTitan Edge profile relaunched." -ForegroundColor Green
