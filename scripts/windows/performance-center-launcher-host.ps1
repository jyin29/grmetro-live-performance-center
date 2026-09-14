param([switch]$AutoStart)
$ErrorActionPreference = "Stop"
$root = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$logs = Join-Path $root "logs"
New-Item -ItemType Directory -Force -Path $logs | Out-Null
$crashLog = Join-Path $logs "control-center-crash.log"
$launcher = Join-Path $PSScriptRoot "performance-center-launcher.ps1"

try {
  if (-not (Test-Path $launcher)) { throw "Missing launcher script: $launcher" }
  if ($AutoStart) { & $launcher -AutoStart } else { & $launcher }
} catch {
  $message = $_.Exception.Message
  $detail = ($_ | Out-String).Trim()
  $entry = @"
$(Get-Date -Format o) CONTROL CENTER STARTUP FAILURE
$message
$detail

"@
  Add-Content -Path $crashLog -Value $entry

  try {
    Add-Type -AssemblyName System.Windows.Forms
    [System.Windows.Forms.MessageBox]::Show(
      "GRMetro Performance Center could not open.`r`n`r`n$message`r`n`r`nA diagnostic log was written to:`r`n$crashLog",
      "GRMetro Performance Center",
      [System.Windows.Forms.MessageBoxButtons]::OK,
      [System.Windows.Forms.MessageBoxIcon]::Error
    ) | Out-Null
  } catch {
    # Last-resort visible fallback if Windows Forms itself cannot initialize.
    Start-Process powershell.exe -ArgumentList "-NoExit -NoProfile -Command `"Write-Host 'GRMetro Performance Center could not open.' -ForegroundColor Red; Write-Host ''; Get-Content -LiteralPath '$crashLog' -Tail 40`""
  }
  exit 1
}
