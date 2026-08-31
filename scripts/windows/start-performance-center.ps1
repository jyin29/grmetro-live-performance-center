param(
  [switch]$SkipBuild,
  [switch]$NoBrowser
)

$ErrorActionPreference = "Stop"
$supervised = Join-Path $PSScriptRoot "start-supervised-performance-center.ps1"

Write-Host "GRMetro Live Performance Center" -ForegroundColor Cyan
Write-Host "Using final independent-TV architecture with the Windows self-healing supervisor." -ForegroundColor DarkGray
Write-Host "The central PC no longer owns a display location; each TV uses its own permanent display URL." -ForegroundColor DarkGray

if($NoBrowser){
  Write-Warning "-NoBrowser is retained for compatibility, but final deployment normally requires the ServiceTitan browser. Starting supervisor without relaunching Edge."
  $root=(Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
  Set-Location $root
  if(-not $SkipBuild){npm run build;if($LASTEXITCODE -ne 0){exit $LASTEXITCODE}}
  & (Join-Path $PSScriptRoot "performance-center-supervisor.ps1") -NoBrowserRecovery
  exit $LASTEXITCODE
}

if($SkipBuild){ & $supervised -SkipBuild } else { & $supervised }
exit $LASTEXITCODE
