param(
  [switch]$SkipBuild,
  [switch]$NoBrowser
)

$ErrorActionPreference = "Stop"
$root = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
Set-Location $root

if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw "Node.js 22 or newer is required." }
if (-not (Test-Path (Join-Path $root "node_modules"))) { throw "Dependencies are not installed. Run setup first." }
if (-not (Test-Path (Join-Path $root ".env"))) { throw "Missing .env. Run scripts\windows\setup-performance-center.ps1 first." }

function Select-DisplayLocation {
  $presentationPath = Join-Path $root "shared\presentation.json"
  $presentation = Get-Content $presentationPath -Raw | ConvertFrom-Json
  $displays = @($presentation.displays)
  if ($displays.Count -eq 0) { throw "No display locations are configured in shared\presentation.json." }

  Write-Host ""
  Write-Host "============================================================" -ForegroundColor DarkCyan
  Write-Host "  SELECT THIS SCREEN'S LOCATION" -ForegroundColor Cyan
  Write-Host "============================================================" -ForegroundColor DarkCyan
  for ($i = 0; $i -lt $displays.Count; $i++) { Write-Host ("  [{0}] {1}" -f ($i + 1), $displays[$i].name) }
  Write-Host ""
  do {
    $choice = Read-Host ("Choose 1-{0} [default: 1]" -f $displays.Count)
    if ([string]::IsNullOrWhiteSpace($choice)) { $choice = "1" }
    $number = 0
    $valid = [int]::TryParse($choice, [ref]$number) -and $number -ge 1 -and $number -le $displays.Count
    if (-not $valid) { Write-Host "Please enter one of the numbers shown above." -ForegroundColor Yellow }
  } while (-not $valid)
  $selected = $displays[$number - 1]
  Write-Host ("Selected: {0}" -f $selected.name) -ForegroundColor Green
  Write-Host "============================================================" -ForegroundColor DarkCyan
  return $selected
}

$selectedDisplay = Select-DisplayLocation

& (Join-Path $PSScriptRoot "launch-edge.ps1")
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

if (-not $SkipBuild) { Write-Host "Building dashboard..."; npm run build; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE } }

$env:NODE_ENV = "production"
$env:MOCK_MODE = "false"
$env:ENABLE_DEVELOPMENT_ROUTES = "false"
$env:HOST = "0.0.0.0"

$logDirectory = Join-Path $root "logs"
New-Item -ItemType Directory -Force -Path $logDirectory | Out-Null
$stdoutLog = Join-Path $logDirectory "launcher-backend.stdout.log"
$stderrLog = Join-Path $logDirectory "launcher-backend.stderr.log"
Remove-Item $stdoutLog,$stderrLog -Force -ErrorAction SilentlyContinue
Write-Host "Starting Live Performance Center..."
$backend = Start-Process -FilePath "node" -ArgumentList "apps/backend/src/index.js" -WorkingDirectory $root -PassThru -WindowStyle Hidden -RedirectStandardOutput $stdoutLog -RedirectStandardError $stderrLog

function Show-BackendStartupLogs {
  Write-Host ""; Write-Host "Backend startup output:" -ForegroundColor Yellow
  if (Test-Path $stdoutLog) { $stdout=Get-Content $stdoutLog -ErrorAction SilentlyContinue; if($stdout){$stdout|Select-Object -Last 40|ForEach-Object{Write-Host $_}} }
  if (Test-Path $stderrLog) { $stderr=Get-Content $stderrLog -ErrorAction SilentlyContinue; if($stderr){$stderr|Select-Object -Last 40|ForEach-Object{Write-Host $_ -ForegroundColor Red}} }
  Write-Host "Full logs: $stdoutLog and $stderrLog" -ForegroundColor DarkGray
}
function Find-Edge {
  $candidatePaths=@(); foreach($base in @(${env:ProgramFiles(x86)},$env:ProgramFiles,$env:LOCALAPPDATA)){if($base){$candidatePaths+=(Join-Path $base "Microsoft\Edge\Application\msedge.exe")}}
  foreach($commandName in @("msedge.exe","msedge")){$command=Get-Command $commandName -ErrorAction SilentlyContinue;if($command -and $command.Source){$candidatePaths+=$command.Source}}
  return $candidatePaths|Where-Object{$_ -and (Test-Path $_)}|Select-Object -First 1
}
function Open-DashboardAtHalfZoom {
  param([string]$Url)
  $edge=Find-Edge; if(-not $edge){Write-Warning "Could not locate Edge; opening the dashboard in the default browser.";Start-Process $Url;return}
  Start-Process -FilePath $edge -ArgumentList @("--new-window",$Url); Start-Sleep -Seconds 3
  try {
    $shell=New-Object -ComObject WScript.Shell
    if($shell.AppActivate("Live Performance Center")){
      Start-Sleep -Milliseconds 750; $shell.SendKeys("^0"); Start-Sleep -Milliseconds 750
      for($i=1;$i -le 5;$i++){ $shell.SendKeys("^-"); Start-Sleep -Milliseconds 700 }
      Write-Host "Dashboard Edge page zoom commands completed (target: 50%)."
      Start-Sleep -Milliseconds 900; $shell.SendKeys("{F11}"); Write-Host "Dashboard Edge window switched to fullscreen (F11)."
    } else { Write-Warning "Dashboard opened, but Edge could not be focused automatically. Set 50% zoom and press F11 manually." }
  } catch { Write-Warning "Dashboard opened, but automatic Edge zoom/fullscreen failed. Set 50% zoom and press F11 manually." }
}
function Get-LanIPv4Address {
  try { $candidates=Get-NetIPConfiguration -ErrorAction Stop|Where-Object{$_.NetAdapter.Status -eq "Up" -and $_.IPv4DefaultGateway -and $_.IPv4Address}|ForEach-Object{$_.IPv4Address.IPAddress}|Where-Object{$_ -and $_ -notlike "169.254.*" -and $_ -ne "127.0.0.1"}; return $candidates|Select-Object -First 1 }
  catch { try { return [System.Net.Dns]::GetHostAddresses([System.Net.Dns]::GetHostName())|Where-Object{$_.AddressFamily -eq [System.Net.Sockets.AddressFamily]::InterNetwork -and $_.IPAddressToString -notlike "169.254.*"}|Select-Object -First 1|ForEach-Object{$_.IPAddressToString} } catch { return $null } }
}
function Show-RemoteAccess {
  param([string]$RemoteUrl,[string]$DisplayName)
  Write-Host ""; Write-Host "============================================================" -ForegroundColor DarkCyan; Write-Host "  PHONE / TABLET REMOTE" -ForegroundColor Cyan; Write-Host "============================================================" -ForegroundColor DarkCyan
  Write-Host "  Screen: $DisplayName" -ForegroundColor White; Write-Host "  Connect your phone to the same Wi-Fi as this PC." -ForegroundColor White; Write-Host "  Remote: $RemoteUrl" -ForegroundColor Green; Write-Host ""
  $curl=Get-Command curl.exe -ErrorAction SilentlyContinue
  if($curl){$tempQr=Join-Path $env:TEMP "live-performance-center-remote-qr.txt";try{$escaped=[System.Uri]::EscapeDataString($RemoteUrl);& $curl.Source -sS --connect-timeout 3 --max-time 6 -o $tempQr "https://qrenco.de/$escaped" 2>$null;if($LASTEXITCODE -ne 0 -or -not(Test-Path $tempQr)){throw "QR service unavailable"};$qrText=[System.IO.File]::ReadAllText($tempQr,[System.Text.Encoding]::UTF8);if([string]::IsNullOrWhiteSpace($qrText)){throw "QR service returned no data"};Write-Host $qrText;Write-Host "  Scan the QR code with your phone camera." -ForegroundColor Cyan}catch{Write-Host "  QR code unavailable right now; type the green address above into your phone." -ForegroundColor Yellow}finally{Remove-Item $tempQr -Force -ErrorAction SilentlyContinue}}
  else{Write-Host "  QR code unavailable; type the green address above into your phone." -ForegroundColor Yellow}
  Write-Host "============================================================" -ForegroundColor DarkCyan; Write-Host ""
}

$health="http://127.0.0.1:3000/api/v1/health"; $deadline=(Get-Date).AddSeconds(30); $healthy=$false
do{Start-Sleep -Milliseconds 500;if($backend.HasExited){Show-BackendStartupLogs;$exitCode=$backend.ExitCode;if($null -eq $exitCode){$exitCode="unknown"};throw "Backend exited during startup with code $exitCode."};try{Invoke-RestMethod -Uri $health -TimeoutSec 2|Out-Null;$healthy=$true;break}catch{}}while((Get-Date)-lt $deadline)
if(-not $healthy){Stop-Process -Id $backend.Id -Force -ErrorAction SilentlyContinue;Show-BackendStartupLogs;throw "Backend did not become healthy in time."}
Write-Host "Live Performance Center is running (PID $($backend.Id))."; Write-Host "Backend health check passed: $health"; Write-Host "Backend logs are stored in $logDirectory."

$displayPath = "/display/$($selectedDisplay.id)"
$lanIp=Get-LanIPv4Address
if($lanIp){Show-RemoteAccess "http://${lanIp}:3000/remote" $selectedDisplay.name}else{Write-Warning "Could not detect a LAN address. The dashboard is running, but the phone remote address could not be generated automatically."}
if(-not $NoBrowser){Open-DashboardAtHalfZoom "http://127.0.0.1:3000$displayPath"}
Write-Host ("This screen is registered as: {0} ({1})" -f $selectedDisplay.name,$selectedDisplay.id) -ForegroundColor Green
Write-Host "Close this window or press Ctrl+C to stop the application."
try{Wait-Process -Id $backend.Id}finally{Stop-Process -Id $backend.Id -Force -ErrorAction SilentlyContinue}
