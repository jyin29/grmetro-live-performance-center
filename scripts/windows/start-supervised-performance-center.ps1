param([switch]$SkipBuild,[string]$ProfilePath)
$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
Set-Location $root
. (Join-Path $PSScriptRoot 'runtime-paths.ps1')

if (-not (Test-GrMetroPortableRuntime $root)) { throw 'The bundled GRMetro runtime is unavailable. Run the latest Setup EXE again.' }
if (-not (Test-Path -LiteralPath (Join-Path $root 'node_modules\playwright\package.json'))) { throw 'Packaged production dependencies are missing. Run the latest Setup EXE again.' }
if (-not (Test-Path -LiteralPath (Join-Path $root 'apps\dashboard\dist\index.html'))) { throw 'The packaged dashboard build is missing. Run the latest Setup EXE again.' }
if (-not (Test-Path -LiteralPath (Join-Path $root '.env'))) { throw 'Missing configuration. Open Setup & Configuration first.' }

Write-Host 'Starting ServiceTitan browser...' -ForegroundColor Cyan
$edgeArguments=@{}
if($ProfilePath){$edgeArguments.ProfilePath=$ProfilePath}
& (Join-Path $PSScriptRoot 'launch-edge.ps1') @edgeArguments
if ($LASTEXITCODE -ne 0) { throw 'ServiceTitan browser launcher failed.' }
Write-Host 'Starting self-healing supervisor...' -ForegroundColor Cyan
Write-Host 'Each Google TV independently loads its permanent /?display=<id> URL.' -ForegroundColor DarkGray
& (Join-Path $PSScriptRoot 'performance-center-supervisor.ps1')
