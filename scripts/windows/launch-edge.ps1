param(
  [int]$Port = 9223,
  [string]$ProfilePath = "C:\edge-dashboard-profile",
  [string]$StartUrl = "https://go.servicetitan.com"
)

$ErrorActionPreference = "Stop"

function Find-Edge {
  $candidates = @(
    "$env:ProgramFiles(x86)\Microsoft\Edge\Application\msedge.exe",
    "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe",
    "$env:LOCALAPPDATA\Microsoft\Edge\Application\msedge.exe"
  ) | Where-Object { $_ -and (Test-Path $_) }
  if (-not $candidates) { throw "Microsoft Edge was not found. Install Edge and try again." }
  return $candidates[0]
}

$edge = Find-Edge
New-Item -ItemType Directory -Force -Path $ProfilePath | Out-Null
$debugUrl = "http://127.0.0.1:$Port/json/version"

try {
  Invoke-RestMethod -Uri $debugUrl -TimeoutSec 2 | Out-Null
  Write-Host "Dashboard Edge session is already available on port $Port."
  exit 0
} catch { }

Write-Host "Starting dedicated dashboard Edge session on port $Port..."
Start-Process -FilePath $edge -ArgumentList @(
  "--remote-debugging-port=$Port",
  "--user-data-dir=$ProfilePath",
  "--no-first-run",
  "--no-default-browser-check",
  $StartUrl
)

$deadline = (Get-Date).AddSeconds(20)
do {
  Start-Sleep -Milliseconds 500
  try {
    Invoke-RestMethod -Uri $debugUrl -TimeoutSec 2 | Out-Null
    Write-Host "Edge remote debugging is ready."
    exit 0
  } catch { }
} while ((Get-Date) -lt $deadline)

throw "Edge started, but remote debugging did not become available on port $Port."
