param([switch]$AutoStart)
$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$root = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$setupScript = Join-Path $PSScriptRoot "setup-performance-center.ps1"
$startScript = Join-Path $PSScriptRoot "start-supervised-performance-center.ps1"
$adminScript = Join-Path $PSScriptRoot "admin-control.ps1"
$logPath = Join-Path $root "logs\supervisor.log"
$launcherLog = Join-Path $root "logs\launcher.log"
New-Item -ItemType Directory -Force -Path (Join-Path $root "logs") | Out-Null

function Log([string]$message) {
  $line = "$(Get-Date -Format o) $message"
  Add-Content -Path $launcherLog -Value $line
}
function Test-Backend {
  try {
    $response = Invoke-RestMethod -Uri "http://127.0.0.1:3000/api/v1/health" -TimeoutSec 2
    return $true
  } catch { return $false }
}
function Get-LanAddress {
  try {
    $ip = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction Stop |
      Where-Object { $_.IPAddress -notlike "127.*" -and $_.IPAddress -notlike "169.254*" -and $_.PrefixOrigin -ne "WellKnown" } |
      Sort-Object InterfaceMetric | Select-Object -First 1 -ExpandProperty IPAddress
    if ($ip) { return $ip }
  } catch {}
  return "<this-PC-IP>"
}
function Needs-Setup {
  if (-not (Get-Command node -ErrorAction SilentlyContinue)) { return $true }
  if (-not (Test-Path (Join-Path $root "node_modules"))) { return $true }
  if (-not (Test-Path (Join-Path $root ".env"))) { return $true }
  if (-not (Test-Path (Join-Path $root "apps\dashboard\dist\index.html"))) { return $true }
  return $false
}
function Run-HiddenWait([string]$script, [string]$arguments = "") {
  $argList = "-NoProfile -ExecutionPolicy Bypass -File `"$script`" $arguments"
  $p = Start-Process powershell.exe -ArgumentList $argList -WorkingDirectory $root -WindowStyle Hidden -PassThru -Wait
  return $p.ExitCode
}
function Start-Supervisor {
  if (Test-Backend) { return }
  $args = "-NoProfile -ExecutionPolicy Bypass -File `"$startScript`" -SkipBuild"
  Start-Process powershell.exe -ArgumentList $args -WorkingDirectory $root -WindowStyle Minimized | Out-Null
}
function Open-Url([string]$url) { Start-Process $url }
function Run-Admin([string]$command) {
  Start-Process powershell.exe -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$adminScript`" $command" -WorkingDirectory $root
}

$form = New-Object System.Windows.Forms.Form
$form.Text = "GRMetro Performance Center"
$form.Size = New-Object System.Drawing.Size(760,620)
$form.MinimumSize = New-Object System.Drawing.Size(760,620)
$form.StartPosition = "CenterScreen"
$form.BackColor = [System.Drawing.Color]::FromArgb(245,247,250)
$form.Font = New-Object System.Drawing.Font("Segoe UI",10)

$header = New-Object System.Windows.Forms.Panel
$header.Dock = "Top"; $header.Height = 92; $header.BackColor = [System.Drawing.Color]::FromArgb(20,32,49)
$form.Controls.Add($header)
$title = New-Object System.Windows.Forms.Label
$title.Text = "GRMetro Performance Center"; $title.ForeColor = [System.Drawing.Color]::White; $title.Font = New-Object System.Drawing.Font("Segoe UI Semibold",21); $title.AutoSize = $true; $title.Location = New-Object System.Drawing.Point(26,18)
$header.Controls.Add($title)
$subtitle = New-Object System.Windows.Forms.Label
$subtitle.Text = "Backend + ServiceTitan control center"; $subtitle.ForeColor = [System.Drawing.Color]::FromArgb(184,198,214); $subtitle.AutoSize = $true; $subtitle.Location = New-Object System.Drawing.Point(29,58)
$header.Controls.Add($subtitle)

$statusCard = New-Object System.Windows.Forms.Panel
$statusCard.Location = New-Object System.Drawing.Point(24,112); $statusCard.Size = New-Object System.Drawing.Size(696,112); $statusCard.BackColor = [System.Drawing.Color]::White
$form.Controls.Add($statusCard)
$statusTitle = New-Object System.Windows.Forms.Label
$statusTitle.Text = "SYSTEM STATUS"; $statusTitle.ForeColor = [System.Drawing.Color]::FromArgb(105,118,134); $statusTitle.Font = New-Object System.Drawing.Font("Segoe UI Semibold",9); $statusTitle.AutoSize=$true; $statusTitle.Location=New-Object System.Drawing.Point(20,16)
$statusCard.Controls.Add($statusTitle)
$statusLabel = New-Object System.Windows.Forms.Label
$statusLabel.Text = "Checking…"; $statusLabel.Font = New-Object System.Drawing.Font("Segoe UI Semibold",18); $statusLabel.AutoSize=$true; $statusLabel.Location=New-Object System.Drawing.Point(20,40)
$statusCard.Controls.Add($statusLabel)
$statusDetail = New-Object System.Windows.Forms.Label
$statusDetail.Text = ""; $statusDetail.ForeColor=[System.Drawing.Color]::FromArgb(90,102,116); $statusDetail.AutoSize=$true; $statusDetail.Location=New-Object System.Drawing.Point(22,78)
$statusCard.Controls.Add($statusDetail)

$primary = New-Object System.Windows.Forms.Button
$primary.Location=New-Object System.Drawing.Point(24,242); $primary.Size=New-Object System.Drawing.Size(696,54); $primary.FlatStyle="Flat"; $primary.Font=New-Object System.Drawing.Font("Segoe UI Semibold",12); $primary.BackColor=[System.Drawing.Color]::FromArgb(21,112,239); $primary.ForeColor=[System.Drawing.Color]::White; $primary.FlatAppearance.BorderSize=0
$form.Controls.Add($primary)

$info = New-Object System.Windows.Forms.Label
$info.Location=New-Object System.Drawing.Point(28,309); $info.Size=New-Object System.Drawing.Size(688,44); $info.ForeColor=[System.Drawing.Color]::FromArgb(75,87,101)
$form.Controls.Add($info)

function Make-Button([string]$text,[int]$x,[int]$y,[int]$w=216) {
  $b=New-Object System.Windows.Forms.Button; $b.Text=$text; $b.Location=New-Object System.Drawing.Point($x,$y); $b.Size=New-Object System.Drawing.Size($w,42); $b.FlatStyle="Flat"; $b.BackColor=[System.Drawing.Color]::White; $b.FlatAppearance.BorderColor=[System.Drawing.Color]::FromArgb(210,217,226); return $b
}
$remote=Make-Button "Open Phone Remote" 24 368; $form.Controls.Add($remote)
$admin=Make-Button "Open Admin Diagnostics" 264 368; $form.Controls.Add($admin)
$logs=Make-Button "Open Recovery Logs" 504 368; $form.Controls.Add($logs)
$refresh=Make-Button "Refresh Data" 24 422; $form.Controls.Add($refresh)
$restartBackend=Make-Button "Restart Backend" 264 422; $form.Controls.Add($restartBackend)
$restartBrowser=Make-Button "Restart ServiceTitan Browser" 504 422; $form.Controls.Add($restartBrowser)
$shortcut=Make-Button "Create Desktop Shortcut" 24 476; $form.Controls.Add($shortcut)
$openFolder=Make-Button "Open Program Folder" 264 476; $form.Controls.Add($openFolder)
$close=Make-Button "Close Control Center" 504 476; $form.Controls.Add($close)

$footer = New-Object System.Windows.Forms.Label
$footer.Text="Closing this window does not stop the self-healing backend."; $footer.ForeColor=[System.Drawing.Color]::FromArgb(105,118,134); $footer.AutoSize=$true; $footer.Location=New-Object System.Drawing.Point(27,542)
$form.Controls.Add($footer)

$lan = Get-LanAddress
function Update-Status {
  $ready = -not (Needs-Setup)
  $online = Test-Backend
  if ($online) {
    $statusLabel.Text="Running"; $statusLabel.ForeColor=[System.Drawing.Color]::FromArgb(25,135,84)
    $statusDetail.Text="Backend healthy · self-healing supervisor active"
    $primary.Text="Performance Center is Running"
    $primary.Enabled=$false; $primary.BackColor=[System.Drawing.Color]::FromArgb(119,133,148)
  } elseif ($ready) {
    $statusLabel.Text="Ready to start"; $statusLabel.ForeColor=[System.Drawing.Color]::FromArgb(190,116,0)
    $statusDetail.Text="Setup is complete. Start the supervised backend and ServiceTitan browser."
    $primary.Text="START PERFORMANCE CENTER"
    $primary.Enabled=$true; $primary.BackColor=[System.Drawing.Color]::FromArgb(21,112,239)
  } else {
    $statusLabel.Text="First-time setup needed"; $statusLabel.ForeColor=[System.Drawing.Color]::FromArgb(190,116,0)
    $statusDetail.Text="One click will install dependencies, build, test, and start the system."
    $primary.Text="SET UP + START"
    $primary.Enabled=$true; $primary.BackColor=[System.Drawing.Color]::FromArgb(21,112,239)
  }
  $info.Text="Remote: http://${lan}:3000/remote`r`nTVs: http://${lan}:3000/?display=<display-id>"
}

$primary.Add_Click({
  $primary.Enabled=$false
  try {
    if (Needs-Setup) {
      $statusLabel.Text="Setting up…"; $statusDetail.Text="Installing, building, and validating. This can take a few minutes."; $form.Refresh()
      Log "First-run setup requested"
      $code = Run-HiddenWait $setupScript
      if ($code -ne 0) { throw "Setup failed (exit code $code). Open logs or run Setup Live Performance Center.cmd for details." }
    }
    $statusLabel.Text="Starting…"; $statusDetail.Text="Launching ServiceTitan browser and self-healing backend."; $form.Refresh()
    Start-Supervisor
    $deadline=(Get-Date).AddSeconds(35)
    while((Get-Date)-lt$deadline -and -not(Test-Backend)){Start-Sleep -Milliseconds 750;[System.Windows.Forms.Application]::DoEvents()}
    if(-not(Test-Backend)){throw "The backend did not become healthy in time. Check Recovery Logs."}
    Log "Performance Center started"
  } catch {
    Log "Launcher error: $($_.Exception.Message)"
    [System.Windows.Forms.MessageBox]::Show($_.Exception.Message,"GRMetro Performance Center",[System.Windows.Forms.MessageBoxButtons]::OK,[System.Windows.Forms.MessageBoxIcon]::Error)|Out-Null
  }
  Update-Status
})
$remote.Add_Click({Open-Url "http://${lan}:3000/remote"})
$admin.Add_Click({Open-Url "http://127.0.0.1:3000/admin"})
$logs.Add_Click({if(Test-Path $logPath){Start-Process notepad.exe -ArgumentList "`"$logPath`""}else{[System.Windows.Forms.MessageBox]::Show("No supervisor log exists yet.")|Out-Null}})
$refresh.Add_Click({Run-Admin "refresh-data"})
$restartBackend.Add_Click({Run-Admin "restart-backend"})
$restartBrowser.Add_Click({Run-Admin "restart-browser"})
$shortcut.Add_Click({
  try {
    $shell=New-Object -ComObject WScript.Shell
    $desktop=[Environment]::GetFolderPath("Desktop")
    $lnk=$shell.CreateShortcut((Join-Path $desktop "GRMetro Performance Center.lnk"))
    $lnk.TargetPath=Join-Path $root "GRMetro Performance Center.cmd"
    $lnk.WorkingDirectory=$root
    $lnk.Description="Start and manage the GRMetro Live Performance Center"
    $lnk.Save()
    [System.Windows.Forms.MessageBox]::Show("Desktop shortcut created.","GRMetro Performance Center")|Out-Null
  } catch {[System.Windows.Forms.MessageBox]::Show($_.Exception.Message,"Could not create shortcut")|Out-Null}
})
$openFolder.Add_Click({Start-Process explorer.exe -ArgumentList "`"$root`""})
$close.Add_Click({$form.Close()})
$timer=New-Object System.Windows.Forms.Timer; $timer.Interval=5000; $timer.Add_Tick({Update-Status}); $timer.Start()
Update-Status
if($AutoStart){$form.Add_Shown({if(-not(Test-Backend)){$primary.PerformClick()}})}
[void]$form.ShowDialog()
$timer.Stop()
