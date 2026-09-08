param([switch]$AutoStart)
$ErrorActionPreference = "Stop"
Add-Type -AssemblyName PresentationFramework
Add-Type -AssemblyName PresentationCore
Add-Type -AssemblyName WindowsBase

$root = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$setupScript = Join-Path $PSScriptRoot "setup-performance-center.ps1"
$startScript = Join-Path $PSScriptRoot "start-supervised-performance-center.ps1"
$adminScript = Join-Path $PSScriptRoot "admin-control.ps1"
$logPath = Join-Path $root "logs\supervisor.log"
$launcherLog = Join-Path $root "logs\launcher.log"
New-Item -ItemType Directory -Force -Path (Join-Path $root "logs") | Out-Null

function Log([string]$message) {
  Add-Content -Path $launcherLog -Value "$(Get-Date -Format o) $message"
}
function Test-Backend {
  try { Invoke-RestMethod -Uri "http://127.0.0.1:3000/api/v1/health" -TimeoutSec 2 | Out-Null; return $true }
  catch { return $false }
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
  $args = "-NoProfile -ExecutionPolicy Bypass -File `"$script`" $arguments"
  return (Start-Process powershell.exe -ArgumentList $args -WorkingDirectory $root -WindowStyle Hidden -PassThru -Wait).ExitCode
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
function Show-Error([string]$message) {
  [System.Windows.MessageBox]::Show($window, $message, "GRMetro Performance Center", "OK", "Error") | Out-Null
}
function Brush([string]$hex) { return [System.Windows.Media.BrushConverter]::new().ConvertFromString($hex) }

[xml]$xaml = @'
<Window xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
        Title="GRMetro Performance Center" Width="980" Height="720" MinWidth="920" MinHeight="680"
        WindowStartupLocation="CenterScreen" Background="#F4F7FB" FontFamily="Segoe UI" Foreground="#172033">
  <Window.Resources>
    <Style x:Key="PrimaryButton" TargetType="Button">
      <Setter Property="Foreground" Value="White"/><Setter Property="Background" Value="#0F6CBD"/>
      <Setter Property="FontSize" Value="15"/><Setter Property="FontWeight" Value="SemiBold"/>
      <Setter Property="Padding" Value="18,13"/><Setter Property="BorderThickness" Value="0"/><Setter Property="Cursor" Value="Hand"/>
      <Setter Property="Template"><Setter.Value><ControlTemplate TargetType="Button"><Border x:Name="Bg" Background="{TemplateBinding Background}" CornerRadius="10" Padding="{TemplateBinding Padding}"><ContentPresenter HorizontalAlignment="Center" VerticalAlignment="Center"/></Border><ControlTemplate.Triggers><Trigger Property="IsMouseOver" Value="True"><Setter TargetName="Bg" Property="Opacity" Value="0.92"/></Trigger><Trigger Property="IsPressed" Value="True"><Setter TargetName="Bg" Property="Opacity" Value="0.82"/></Trigger><Trigger Property="IsEnabled" Value="False"><Setter TargetName="Bg" Property="Background" Value="#95A3B5"/><Setter TargetName="Bg" Property="Opacity" Value="0.86"/></Trigger></ControlTemplate.Triggers></ControlTemplate></Setter.Value></Setter>
    </Style>
    <Style x:Key="TileButton" TargetType="Button">
      <Setter Property="Background" Value="White"/><Setter Property="Foreground" Value="#263248"/><Setter Property="BorderBrush" Value="#DCE3EC"/>
      <Setter Property="BorderThickness" Value="1"/><Setter Property="Padding" Value="14"/><Setter Property="Cursor" Value="Hand"/><Setter Property="HorizontalContentAlignment" Value="Left"/>
      <Setter Property="Template"><Setter.Value><ControlTemplate TargetType="Button"><Border x:Name="Tile" Background="{TemplateBinding Background}" BorderBrush="{TemplateBinding BorderBrush}" BorderThickness="{TemplateBinding BorderThickness}" CornerRadius="12" Padding="{TemplateBinding Padding}"><ContentPresenter/></Border><ControlTemplate.Triggers><Trigger Property="IsMouseOver" Value="True"><Setter TargetName="Tile" Property="Background" Value="#F8FAFD"/><Setter TargetName="Tile" Property="BorderBrush" Value="#B8C6D8"/></Trigger><Trigger Property="IsPressed" Value="True"><Setter TargetName="Tile" Property="Background" Value="#EEF3F9"/></Trigger></ControlTemplate.Triggers></ControlTemplate></Setter.Value></Setter>
    </Style>
  </Window.Resources>
  <Grid>
    <Grid.RowDefinitions><RowDefinition Height="112"/><RowDefinition Height="*"/><RowDefinition Height="42"/></Grid.RowDefinitions>

    <Border Grid.Row="0" Background="#172033">
      <Grid Margin="32,0">
        <Grid.ColumnDefinitions><ColumnDefinition Width="*"/><ColumnDefinition Width="Auto"/></Grid.ColumnDefinitions>
        <StackPanel VerticalAlignment="Center">
          <TextBlock Text="GRMetro" Foreground="#75B8F4" FontSize="13" FontWeight="SemiBold"/>
          <TextBlock Text="Performance Center" Foreground="White" FontSize="30" FontWeight="SemiBold" Margin="0,2,0,0"/>
          <TextBlock Text="Backend operations · ServiceTitan · display network" Foreground="#AEBCCE" FontSize="13" Margin="0,4,0,0"/>
        </StackPanel>
        <Border Grid.Column="1" x:Name="HeaderStatusPill" Background="#26364C" CornerRadius="14" Padding="12,6" VerticalAlignment="Center">
          <StackPanel Orientation="Horizontal"><Ellipse x:Name="HeaderStatusDot" Width="8" Height="8" Fill="#F0A400" Margin="0,0,8,0"/><TextBlock x:Name="HeaderStatusText" Text="Checking" Foreground="White" FontSize="12" FontWeight="SemiBold"/></StackPanel>
        </Border>
      </Grid>
    </Border>

    <ScrollViewer Grid.Row="1" VerticalScrollBarVisibility="Auto">
      <Grid Margin="32,26,32,22">
        <Grid.RowDefinitions><RowDefinition Height="Auto"/><RowDefinition Height="Auto"/><RowDefinition Height="Auto"/><RowDefinition Height="Auto"/></Grid.RowDefinitions>

        <Border Grid.Row="0" Background="White" BorderBrush="#E1E7EF" BorderThickness="1" CornerRadius="16" Padding="24">
          <Grid>
            <Grid.ColumnDefinitions><ColumnDefinition Width="*"/><ColumnDefinition Width="300"/></Grid.ColumnDefinitions>
            <StackPanel>
              <TextBlock Text="SYSTEM STATUS" Foreground="#758397" FontSize="11" FontWeight="SemiBold"/>
              <StackPanel Orientation="Horizontal" Margin="0,9,0,0"><Ellipse x:Name="StatusDot" Width="12" Height="12" Fill="#F0A400" Margin="0,8,11,0" VerticalAlignment="Top"/><TextBlock x:Name="StatusLabel" Text="Checking…" FontSize="25" FontWeight="SemiBold"/></StackPanel>
              <TextBlock x:Name="StatusDetail" Text="Reading backend health…" Foreground="#647287" FontSize="13" Margin="23,6,0,0" TextWrapping="Wrap"/>
            </StackPanel>
            <StackPanel Grid.Column="1" VerticalAlignment="Center">
              <Button x:Name="PrimaryButton" Style="{StaticResource PrimaryButton}" Content="CHECKING…" IsEnabled="False"/>
              <TextBlock Text="Safe to close after startup" Foreground="#8190A4" FontSize="11" HorizontalAlignment="Center" Margin="0,8,0,0"/>
            </StackPanel>
          </Grid>
        </Border>

        <Grid Grid.Row="1" Margin="0,18,0,0">
          <Grid.ColumnDefinitions><ColumnDefinition Width="*"/><ColumnDefinition Width="14"/><ColumnDefinition Width="*"/></Grid.ColumnDefinitions>
          <Border Grid.Column="0" Background="#EAF4FF" BorderBrush="#CFE6FA" BorderThickness="1" CornerRadius="12" Padding="18,14">
            <StackPanel><TextBlock Text="PHONE REMOTE" Foreground="#51779A" FontSize="10" FontWeight="SemiBold"/><TextBlock x:Name="RemoteUrl" Text="http://.../remote" Foreground="#183B5B" FontFamily="Consolas" FontSize="12" Margin="0,5,0,0" TextTrimming="CharacterEllipsis"/></StackPanel>
          </Border>
          <Border Grid.Column="2" Background="#F4F1FF" BorderBrush="#DED7F7" BorderThickness="1" CornerRadius="12" Padding="18,14">
            <StackPanel><TextBlock Text="TV DISPLAY URL" Foreground="#6F5F9C" FontSize="10" FontWeight="SemiBold"/><TextBlock x:Name="DisplayUrl" Text="http://.../?display=&lt;display-id&gt;" Foreground="#493E66" FontFamily="Consolas" FontSize="12" Margin="0,5,0,0" TextTrimming="CharacterEllipsis"/></StackPanel>
          </Border>
        </Grid>

        <Grid Grid.Row="2" Margin="0,23,0,0">
          <Grid.ColumnDefinitions><ColumnDefinition Width="*"/><ColumnDefinition Width="12"/><ColumnDefinition Width="*"/><ColumnDefinition Width="12"/><ColumnDefinition Width="*"/></Grid.ColumnDefinitions>
          <Grid.RowDefinitions><RowDefinition Height="82"/><RowDefinition Height="12"/><RowDefinition Height="82"/><RowDefinition Height="12"/><RowDefinition Height="82"/></Grid.RowDefinitions>

          <Button x:Name="RemoteButton" Grid.Row="0" Grid.Column="0" Style="{StaticResource TileButton}"><StackPanel><TextBlock Text="Open Phone Remote" FontWeight="SemiBold" FontSize="14"/><TextBlock Text="Control displays from this network" Foreground="#77869A" FontSize="11" Margin="0,4,0,0"/></StackPanel></Button>
          <Button x:Name="AdminButton" Grid.Row="0" Grid.Column="2" Style="{StaticResource TileButton}"><StackPanel><TextBlock Text="Admin Diagnostics" FontWeight="SemiBold" FontSize="14"/><TextBlock Text="Inspect system and display health" Foreground="#77869A" FontSize="11" Margin="0,4,0,0"/></StackPanel></Button>
          <Button x:Name="LogsButton" Grid.Row="0" Grid.Column="4" Style="{StaticResource TileButton}"><StackPanel><TextBlock Text="Recovery Logs" FontWeight="SemiBold" FontSize="14"/><TextBlock Text="Open supervisor recovery history" Foreground="#77869A" FontSize="11" Margin="0,4,0,0"/></StackPanel></Button>

          <Button x:Name="RefreshButton" Grid.Row="2" Grid.Column="0" Style="{StaticResource TileButton}"><StackPanel><TextBlock Text="Refresh Data" FontWeight="SemiBold" FontSize="14"/><TextBlock Text="Request a fresh ServiceTitan sync" Foreground="#77869A" FontSize="11" Margin="0,4,0,0"/></StackPanel></Button>
          <Button x:Name="RestartBackendButton" Grid.Row="2" Grid.Column="2" Style="{StaticResource TileButton}"><StackPanel><TextBlock Text="Restart Backend" FontWeight="SemiBold" FontSize="14"/><TextBlock Text="Restart only the backend service" Foreground="#77869A" FontSize="11" Margin="0,4,0,0"/></StackPanel></Button>
          <Button x:Name="RestartBrowserButton" Grid.Row="2" Grid.Column="4" Style="{StaticResource TileButton}"><StackPanel><TextBlock Text="Restart ServiceTitan" FontWeight="SemiBold" FontSize="14"/><TextBlock Text="Relaunch the dedicated Edge session" Foreground="#77869A" FontSize="11" Margin="0,4,0,0"/></StackPanel></Button>

          <Button x:Name="ShortcutButton" Grid.Row="4" Grid.Column="0" Style="{StaticResource TileButton}"><StackPanel><TextBlock Text="Desktop Shortcut" FontWeight="SemiBold" FontSize="14"/><TextBlock Text="Create a one-click desktop launcher" Foreground="#77869A" FontSize="11" Margin="0,4,0,0"/></StackPanel></Button>
          <Button x:Name="FolderButton" Grid.Row="4" Grid.Column="2" Style="{StaticResource TileButton}"><StackPanel><TextBlock Text="Program Folder" FontWeight="SemiBold" FontSize="14"/><TextBlock Text="Open the project directory" Foreground="#77869A" FontSize="11" Margin="0,4,0,0"/></StackPanel></Button>
          <Button x:Name="CloseButton" Grid.Row="4" Grid.Column="4" Style="{StaticResource TileButton}"><StackPanel><TextBlock Text="Close Control Center" FontWeight="SemiBold" FontSize="14"/><TextBlock Text="Backend keeps running" Foreground="#77869A" FontSize="11" Margin="0,4,0,0"/></StackPanel></Button>
        </Grid>

        <TextBlock Grid.Row="3" Text="The self-healing supervisor continues running after this window is closed." Foreground="#8390A2" FontSize="11" HorizontalAlignment="Center" Margin="0,22,0,0"/>
      </Grid>
    </ScrollViewer>

    <Border Grid.Row="2" Background="#EBEFF5" BorderBrush="#DDE4EC" BorderThickness="0,1,0,0">
      <Grid Margin="32,0"><TextBlock Text="GRMetro Live Performance Center" Foreground="#758397" FontSize="11" VerticalAlignment="Center"/><TextBlock x:Name="LastCheckedText" Text="" Foreground="#8D99A8" FontSize="11" HorizontalAlignment="Right" VerticalAlignment="Center"/></Grid>
    </Border>
  </Grid>
</Window>
'@

$reader = New-Object System.Xml.XmlNodeReader $xaml
$window = [Windows.Markup.XamlReader]::Load($reader)
function C([string]$name) { return $window.FindName($name) }
$primary = C "PrimaryButton"; $statusLabel = C "StatusLabel"; $statusDetail = C "StatusDetail"; $statusDot = C "StatusDot"
$headerStatusText = C "HeaderStatusText"; $headerStatusDot = C "HeaderStatusDot"; $remoteUrl = C "RemoteUrl"; $displayUrl = C "DisplayUrl"; $lastChecked = C "LastCheckedText"
$remote = C "RemoteButton"; $admin = C "AdminButton"; $logs = C "LogsButton"; $refresh = C "RefreshButton"; $restartBackend = C "RestartBackendButton"; $restartBrowser = C "RestartBrowserButton"; $shortcut = C "ShortcutButton"; $openFolder = C "FolderButton"; $close = C "CloseButton"
$lan = Get-LanAddress

function Set-Status([string]$title,[string]$detail,[string]$pill,[string]$color) {
  $statusLabel.Text = $title; $statusDetail.Text = $detail; $statusDot.Fill = Brush $color; $headerStatusDot.Fill = Brush $color; $headerStatusText.Text = $pill
}
function Update-Status {
  $ready = -not (Needs-Setup); $online = Test-Backend
  if ($online) {
    Set-Status "Running" "Backend healthy · self-healing supervisor active" "ONLINE" "#29A36A"
    $primary.Content = "PERFORMANCE CENTER IS RUNNING"; $primary.IsEnabled = $false
  } elseif ($ready) {
    Set-Status "Ready to start" "Setup is complete. Start the supervised backend and ServiceTitan browser." "READY" "#E2A21B"
    $primary.Content = "START PERFORMANCE CENTER"; $primary.IsEnabled = $true; $primary.Background = Brush "#0F6CBD"
  } else {
    Set-Status "First-time setup needed" "One click will install dependencies, build, test, and start the system." "SETUP" "#E2A21B"
    $primary.Content = "SET UP + START"; $primary.IsEnabled = $true; $primary.Background = Brush "#0F6CBD"
  }
  $remoteUrl.Text = "http://${lan}:3000/remote"
  $displayUrl.Text = "http://${lan}:3000/?display=<display-id>"
  $lastChecked.Text = "Checked $(Get-Date -Format 'h:mm:ss tt')"
}

$primary.Add_Click({
  $primary.IsEnabled = $false
  try {
    if (Needs-Setup) {
      Set-Status "Setting up…" "Installing dependencies, building, and validating. This can take a few minutes." "WORKING" "#4F8EDC"
      $window.Dispatcher.Invoke([action]{}, "Background")
      Log "First-run setup requested"
      $code = Run-HiddenWait $setupScript
      if ($code -ne 0) { throw "Setup failed (exit code $code). Open Recovery Logs or run Setup Live Performance Center.cmd for details." }
    }
    Set-Status "Starting…" "Launching ServiceTitan browser and self-healing backend." "STARTING" "#4F8EDC"
    $window.Dispatcher.Invoke([action]{}, "Background")
    Start-Supervisor
    $deadline = (Get-Date).AddSeconds(35)
    while ((Get-Date) -lt $deadline -and -not (Test-Backend)) { Start-Sleep -Milliseconds 750; [System.Windows.Threading.Dispatcher]::CurrentDispatcher.Invoke([action]{}, "Background") }
    if (-not (Test-Backend)) { throw "The backend did not become healthy in time. Check Recovery Logs." }
    Log "Performance Center started"
  } catch {
    Log "Launcher error: $($_.Exception.Message)"
    Show-Error $_.Exception.Message
  }
  Update-Status
})
$remote.Add_Click({ Open-Url "http://${lan}:3000/remote" })
$admin.Add_Click({ Open-Url "http://127.0.0.1:3000/admin" })
$logs.Add_Click({ if (Test-Path $logPath) { Start-Process notepad.exe -ArgumentList "`"$logPath`"" } else { [System.Windows.MessageBox]::Show($window,"No supervisor log exists yet.","GRMetro Performance Center") | Out-Null } })
$refresh.Add_Click({ Run-Admin "refresh-data" })
$restartBackend.Add_Click({ Run-Admin "restart-backend" })
$restartBrowser.Add_Click({ Run-Admin "restart-browser" })
$shortcut.Add_Click({
  try {
    $shell = New-Object -ComObject WScript.Shell; $desktop = [Environment]::GetFolderPath("Desktop")
    $lnk = $shell.CreateShortcut((Join-Path $desktop "GRMetro Performance Center.lnk")); $lnk.TargetPath = Join-Path $root "GRMetro Performance Center.cmd"; $lnk.WorkingDirectory = $root; $lnk.Description = "Start and manage the GRMetro Live Performance Center"; $lnk.Save()
    [System.Windows.MessageBox]::Show($window,"Desktop shortcut created.","GRMetro Performance Center") | Out-Null
  } catch { Show-Error $_.Exception.Message }
})
$openFolder.Add_Click({ Start-Process explorer.exe -ArgumentList "`"$root`"" })
$close.Add_Click({ $window.Close() })

$timer = New-Object System.Windows.Threading.DispatcherTimer
$timer.Interval = [TimeSpan]::FromSeconds(5)
$timer.Add_Tick({ Update-Status })
$timer.Start()
Update-Status
if ($AutoStart) { $window.Add_ContentRendered({ if (-not (Test-Backend)) { $primary.RaiseEvent((New-Object System.Windows.RoutedEventArgs([System.Windows.Controls.Button]::ClickEvent))) } }) }
[void]$window.ShowDialog()
$timer.Stop()
