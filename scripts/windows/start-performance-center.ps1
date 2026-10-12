param(
  [switch]$SkipBuild,
  [switch]$NoBrowser
)

$ErrorActionPreference = 'Stop'
$supervised = Join-Path $PSScriptRoot 'start-supervised-performance-center.ps1'

Write-Host 'GRMetro Live Performance Center' -ForegroundColor Cyan
Write-Host 'Using the portable runtime and Windows self-healing supervisor.' -ForegroundColor DarkGray

if ($NoBrowser) {
  Write-Warning '-NoBrowser is retained for recovery use. ServiceTitan normally requires the dedicated browser.'
  $root = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
  . (Join-Path $PSScriptRoot 'runtime-paths.ps1')
  if (-not (Test-GrMetroPortableRuntime $root)) { throw 'The bundled GRMetro runtime is unavailable. Run the latest Setup EXE again.' }
  & (Join-Path $PSScriptRoot 'performance-center-supervisor.ps1') -NoBrowserRecovery
  exit $LASTEXITCODE
}

& $supervised -SkipBuild
exit $LASTEXITCODE
