param(
  [int]$Port = 9223,
  [string]$ProfilePath = "C:\edge-dashboard-profile",
  [string]$StartUrl = "https://go.servicetitan.com"
)

$ErrorActionPreference = "Stop"

function Find-Edge {
  $candidatePaths = @()

  foreach ($base in @(${env:ProgramFiles(x86)}, $env:ProgramFiles, $env:LOCALAPPDATA)) {
    if ($base) { $candidatePaths += (Join-Path $base "Microsoft\Edge\Application\msedge.exe") }
  }

  foreach ($commandName in @("msedge.exe", "msedge")) {
    $command = Get-Command $commandName -ErrorAction SilentlyContinue
    if ($command -and $command.Source) { $candidatePaths += $command.Source }
  }

  foreach ($registryPath in @(
    "Registry::HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\msedge.exe",
    "Registry::HKEY_LOCAL_MACHINE\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\App Paths\msedge.exe",
    "Registry::HKEY_CURRENT_USER\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\msedge.exe"
  )) {
    try {
      $registered = (Get-ItemProperty -Path $registryPath -ErrorAction Stop).'(default)'
      if ($registered) { $candidatePaths += $registered }
    } catch { }
  }

  $edge = $candidatePaths | Where-Object { $_ -and (Test-Path $_) } | Select-Object -First 1
  if (-not $edge) {
    throw "Microsoft Edge is installed but its executable could not be located automatically. Expected msedge.exe under Program Files, LocalAppData, PATH, or Windows App Paths."
  }
  return $edge
}

$edge = Find-Edge
Write-Host "Using Microsoft Edge: $edge"
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
