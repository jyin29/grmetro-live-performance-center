param([switch]$SkipWizard)
$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
Set-Location $root
. (Join-Path $PSScriptRoot 'runtime-paths.ps1')

Write-Host 'GRMetro Performance Center setup'
Write-Host '--------------------------------'

$node = Get-GrMetroNodePath $root
$requiredFiles = @(
  'apps\dashboard\dist\index.html',
  'apps\backend\src\index.js',
  'node_modules\express\package.json',
  'node_modules\playwright\package.json',
  'node_modules\qrcode-terminal\package.json'
)
foreach ($relative in $requiredFiles) {
  if (-not (Test-Path -LiteralPath (Join-Path $root $relative) -PathType Leaf)) {
    throw "The portable application payload is incomplete: $relative. Run the latest GRMetro Setup EXE again."
  }
}

$nodeVersion = (& $node --version).Trim()
if ($LASTEXITCODE -ne 0 -or $nodeVersion -notmatch '^v\d+\.\d+\.\d+$') {
  throw 'The bundled GRMetro Node runtime could not start.'
}

& powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot 'launch-edge.ps1') -CheckOnly
if ($LASTEXITCODE -ne 0) { throw 'Microsoft Edge is required for ServiceTitan and could not be found.' }

if (-not (Test-Path -LiteralPath (Join-Path $root '.env'))) {
  Copy-Item -LiteralPath (Join-Path $root '.env.example') -Destination (Join-Path $root '.env')
}
if (-not $SkipWizard) {
  $wizard = Join-Path $PSScriptRoot 'env-wizard.ps1'
  & powershell.exe -STA -NoProfile -ExecutionPolicy Bypass -File $wizard
  if ($LASTEXITCODE -eq 2) { Write-Host 'Setup cancelled.'; exit 2 }
  if ($LASTEXITCODE -ne 0) { throw 'Configuration wizard failed.' }
}
if(Test-Path -LiteralPath (Join-Path $root 'scripts\windows\package-build.json')-PathType Leaf){
  . (Join-Path $PSScriptRoot 'application-validation.ps1')
  $null=Invoke-GrMetroApplicationValidation -InstallRoot $root -SkipBackendStart
}

Write-Host "Portable runtime ready ($nodeVersion)." -ForegroundColor Green
Write-Host 'No global Node.js, npm, Git, build, or dependency installation is required on this computer.' -ForegroundColor DarkGray
Write-Host 'Setup complete.' -ForegroundColor Green
