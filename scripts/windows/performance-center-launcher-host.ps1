param([switch]$AutoStart,[switch]$SelfTest)
$ErrorActionPreference = "Stop"
$root = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$launcher = Join-Path $PSScriptRoot "performance-center-launcher-v2.ps1"

if($SelfTest){
  if(-not(Test-Path -LiteralPath $launcher -PathType Leaf)){throw 'Control Center launcher script is missing.'}
  $tokens=$null;$errors=$null
  $null=[Management.Automation.Language.Parser]::ParseFile($launcher,[ref]$tokens,[ref]$errors)
  if($errors.Count -gt 0){throw 'Control Center launcher script did not pass syntax validation.'}
  Write-Output 'GRMetro Control Center self-test passed.'
  exit 0
}
$logs = Join-Path $root "logs"
New-Item -ItemType Directory -Force -Path $logs | Out-Null
$crashLog = Join-Path $logs "control-center-crash.log"

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
    # Never expose a PowerShell console. The crash log remains available for diagnosis.
  }
  exit 1
}
