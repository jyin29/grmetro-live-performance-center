param([switch]$CheckOnly)
$ErrorActionPreference="Stop"
$root=(Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
Set-Location $root
$result=[ordered]@{supported=$false;updateAvailable=$false;current=$null;latest=$null;message=""}
if(-not(Test-Path (Join-Path $root ".git")) -or -not(Get-Command git -ErrorAction SilentlyContinue)){$result.message="Packaged install: install a newer GRMetro Setup package to update.";if($CheckOnly){$result|ConvertTo-Json -Compress;exit 0};throw $result.message}
$result.supported=$true
$current=(git rev-parse --short HEAD 2>$null).Trim();$result.current=$current
$branch=(git rev-parse --abbrev-ref HEAD 2>$null).Trim()
git fetch origin $branch --quiet
if($LASTEXITCODE -ne 0){throw "Could not contact GitHub to check for updates."}
$latest=(git rev-parse --short "origin/$branch" 2>$null).Trim();$result.latest=$latest
$behind=[int](git rev-list --count "HEAD..origin/$branch" 2>$null)
$result.updateAvailable=$behind -gt 0
$result.message=if($result.updateAvailable){"$behind update commit(s) available."}else{"You are up to date."}
if($CheckOnly){$result|ConvertTo-Json -Compress;exit 0}
if(-not$result.updateAvailable){$result|ConvertTo-Json -Compress;exit 0}
$status=git status --porcelain
if($status){throw "Update stopped because this folder has uncommitted changes. Commit or stash them first."}
$envBackup=$null;if(Test-Path ".env"){$envBackup=Join-Path $env:TEMP ("grmetro-env-"+[guid]::NewGuid().ToString()+".bak");Copy-Item ".env" $envBackup}
try{
  git pull --ff-only origin $branch
  if($LASTEXITCODE -ne 0){throw "git pull failed."}
  npm install
  if($LASTEXITCODE -ne 0){throw "npm install failed."}
  npm test
  if($LASTEXITCODE -ne 0){throw "Tests failed after update. The running system was not restarted."}
  npm run build
  if($LASTEXITCODE -ne 0){throw "Build failed after update. The running system was not restarted."}
  if($envBackup){Copy-Item $envBackup ".env" -Force}
  $admin=Join-Path $PSScriptRoot "admin-control.ps1"
  if(Test-Path $admin){Start-Process powershell.exe -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$admin`" full-recovery" -WorkingDirectory $root}
  $result.current=(git rev-parse --short HEAD).Trim();$result.latest=$result.current;$result.updateAvailable=$false;$result.message="Update installed and recovery restart requested."
  $result|ConvertTo-Json -Compress
}finally{if($envBackup -and(Test-Path $envBackup)){Remove-Item $envBackup -Force -ErrorAction SilentlyContinue}}
