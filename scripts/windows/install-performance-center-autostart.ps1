param([switch]$Remove)
$ErrorActionPreference="Stop"
$root=(Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$taskName="GRMetro Live Performance Center Supervisor"
if($Remove){
  Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue
  Write-Host "Removed $taskName." -ForegroundColor Yellow
  exit 0
}
$supervisor=Join-Path $PSScriptRoot "performance-center-supervisor.ps1"
$powerShell=(Get-Command powershell.exe).Source
$action=New-ScheduledTaskAction -Execute $powerShell -Argument ('-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "{0}"' -f $supervisor) -WorkingDirectory $root
$trigger=New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
$settings=New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1) -ExecutionTimeLimit ([TimeSpan]::Zero)
$principal=New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Highest
Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Description "Keeps the GRMetro backend and ServiceTitan connection running for independent Google TV dashboard displays." -Force | Out-Null
Write-Host "Installed $taskName." -ForegroundColor Green
Write-Host "It will start automatically when $env:USERNAME logs into Windows."
Write-Host "The five TVs remain independent clients and do not require a dashboard window on this PC."
