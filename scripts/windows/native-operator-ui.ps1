$ErrorActionPreference = "Stop"

function Show-GrMetroTextDialog {
  param([string]$Title,[string]$Heading,[string]$Text,[string]$ActionLabel="Close",[switch]$TerminalPalette)
  $dialog = New-Object System.Windows.Window
  $dialog.Title = $Title
  $dialog.Width = 820
  $dialog.Height = 680
  $dialog.MinWidth = 680
  $dialog.MinHeight = 520
  $dialog.WindowStartupLocation = "CenterOwner"
  $dialog.Owner = $window
  $dialog.Background = [Windows.Media.BrushConverter]::new().ConvertFromString("#F4F7FB")
  $grid = New-Object System.Windows.Controls.Grid
  $grid.RowDefinitions.Add((New-Object System.Windows.Controls.RowDefinition -Property @{Height="104"}))
  $grid.RowDefinitions.Add((New-Object System.Windows.Controls.RowDefinition -Property @{Height="*"}))
  $grid.RowDefinitions.Add((New-Object System.Windows.Controls.RowDefinition -Property @{Height="58"}))
  $header=New-Object System.Windows.Controls.Border;$header.Background='#172033'
  $headerContent=New-Object System.Windows.Controls.StackPanel;$headerContent.Margin='28,0';$headerContent.VerticalAlignment='Center'
  $eyebrow=New-Object System.Windows.Controls.TextBlock;$eyebrow.Text='GRMETRO PERFORMANCE CENTER';$eyebrow.Foreground='#75B8F4';$eyebrow.FontSize=11;$eyebrow.FontWeight='SemiBold';$headerContent.Children.Add($eyebrow)|Out-Null
  $head=New-Object System.Windows.Controls.TextBlock;$head.Text=$Heading;$head.Foreground='White';$head.FontSize=27;$head.FontWeight='SemiBold';$headerContent.Children.Add($head)|Out-Null
  $subtitle=New-Object System.Windows.Controls.TextBlock;$subtitle.Text='Secure local access from the native control center';$subtitle.Foreground='#AEBCCE';$subtitle.FontSize=12;$headerContent.Children.Add($subtitle)|Out-Null
  $header.Child=$headerContent;[System.Windows.Controls.Grid]::SetRow($header,0);$grid.Children.Add($header)|Out-Null
  $body=New-Object System.Windows.Controls.Border;$body.Background='White';$body.BorderBrush='#DCE3EC';$body.BorderThickness=1;$body.CornerRadius=12;$body.Margin='28,20';$body.Padding=16
  $box = New-Object System.Windows.Controls.TextBox
  $box.Text=$Text; $box.IsReadOnly=$true; $box.AcceptsReturn=$true; $box.TextWrapping="NoWrap"; $box.VerticalScrollBarVisibility="Auto"; $box.HorizontalScrollBarVisibility="Auto"; $box.FontFamily="Consolas"; $box.FontSize=12; $box.Padding=16; $box.BorderThickness=0
  if($TerminalPalette){$box.Background="#111827";$box.Foreground="White"}else{$box.Background="White";$box.Foreground="#172033"}
  $body.Child=$box;[System.Windows.Controls.Grid]::SetRow($body,1);$grid.Children.Add($body)|Out-Null
  $footer=New-Object System.Windows.Controls.Border;$footer.Background='#EBEFF5';$footer.BorderBrush='#DDE4EC';$footer.BorderThickness='0,1,0,0';[System.Windows.Controls.Grid]::SetRow($footer,2)
  $close = New-Object System.Windows.Controls.Button
  $close.Content=$ActionLabel; $close.Width=110; $close.Height=34; $close.HorizontalAlignment="Right"; $close.Margin="0,0,28,0"
  $close.Add_Click({$dialog.Close()})
  $footer.Child=$close;$grid.Children.Add($footer)|Out-Null
  $dialog.Content=$grid
  [void]$dialog.ShowDialog()
}

function Confirm-GrMetroAction {
  param([string]$Title,[string]$Message)
  return [System.Windows.MessageBox]::Show($window,$Message,$Title,"YesNo","Warning") -eq "Yes"
}

function Show-GrMetroResult {
  param([string]$Title,[string]$Message,[bool]$Success=$true)
  $icon = if($Success){"Information"}else{"Error"}
  [void][System.Windows.MessageBox]::Show($window,$Message,$Title,"OK",$icon)
}

function Invoke-GrMetroUtf8Node {
  param([string]$ScriptPath,[string]$Argument)
  $node=(Get-Command node -ErrorAction Stop).Source
  $start=New-Object System.Diagnostics.ProcessStartInfo
  $start.FileName=$node
  $start.Arguments=('"{0}" "{1}"' -f $ScriptPath.Replace('"','\"'),$Argument.Replace('"','\"'))
  $start.WorkingDirectory=[IO.Path]::GetDirectoryName($ScriptPath)
  $start.UseShellExecute=$false
  $start.CreateNoWindow=$true
  $start.RedirectStandardOutput=$true
  $start.RedirectStandardError=$true
  $utf8=New-Object System.Text.UTF8Encoding($false)
  $start.StandardOutputEncoding=$utf8
  $start.StandardErrorEncoding=$utf8
  $process=New-Object System.Diagnostics.Process
  $process.StartInfo=$start
  if(-not$process.Start()){throw "Could not start the QR renderer."}
  $stdout=$process.StandardOutput.ReadToEnd()
  $stderr=$process.StandardError.ReadToEnd()
  $process.WaitForExit()
  if($process.ExitCode -ne 0){throw $(if($stderr.Trim()){$stderr.Trim()}else{"QR renderer exited with code $($process.ExitCode)."})}
  return $stdout.TrimEnd()
}

function Show-NativeRemoteAccess {
  param([string]$RemoteUrl,[string]$Root)
  $qrScript=Join-Path $Root "scripts\show-remote-qr.js"
  $qr=""
  if(Test-Path $qrScript){
    try { $qr=Invoke-GrMetroUtf8Node -ScriptPath $qrScript -Argument $RemoteUrl } catch { $qr="QR renderer unavailable: $($_.Exception.Message)" }
  }
  $text = "$RemoteUrl`r`n`r`nScan this QR code with your phone:`r`n`r`n$qr"
  Show-GrMetroTextDialog -Title "GRMetro Phone Remote" -Heading "Phone Remote" -Text $text -TerminalPalette
}

function Show-NativeDiagnostics {
  try {
    $data=Invoke-RestMethod "http://127.0.0.1:3000/api/v1/admin" -TimeoutSec 5
    [xml]$markup=@'
<Window xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation" xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml" Title="GRMetro Diagnostics" Width="860" Height="680" MinWidth="760" MinHeight="580" WindowStartupLocation="CenterOwner" Background="#F4F7FB" FontFamily="Segoe UI" Foreground="#172033">
<Grid><Grid.RowDefinitions><RowDefinition Height="104"/><RowDefinition Height="*"/><RowDefinition Height="58"/></Grid.RowDefinitions>
<Border Background="#172033"><StackPanel Margin="28,0" VerticalAlignment="Center"><TextBlock Text="ADMIN DIAGNOSTICS" Foreground="#75B8F4" FontSize="11" FontWeight="SemiBold"/><TextBlock Text="System health at a glance" Foreground="White" FontSize="27" FontWeight="SemiBold"/><TextBlock x:Name="GeneratedAt" xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml" Foreground="#AEBCCE" FontSize="12"/></StackPanel></Border>
<ScrollViewer Grid.Row="1" VerticalScrollBarVisibility="Auto"><StackPanel Margin="28,22">
<UniformGrid Columns="2">
<Border Background="White" BorderBrush="#DCE3EC" BorderThickness="1" CornerRadius="12" Padding="18" Margin="0,0,7,14"><Grid><Grid.ColumnDefinitions><ColumnDefinition Width="Auto"/><ColumnDefinition/></Grid.ColumnDefinitions><Ellipse x:Name="BrowserDot" xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml" Width="12" Height="12" Fill="#D97706" Margin="0,6,12,0" VerticalAlignment="Top"/><StackPanel Grid.Column="1"><TextBlock Text="SERVICETITAN BROWSER" Foreground="#758397" FontSize="10" FontWeight="SemiBold"/><TextBlock x:Name="BrowserState" Text="Checking" FontSize="20" FontWeight="SemiBold" Margin="0,4,0,0"/><TextBlock x:Name="BrowserDetail" Foreground="#647287" FontSize="12" Margin="0,4,0,0" TextWrapping="Wrap"/></StackPanel></Grid></Border>
<Border Background="White" BorderBrush="#DCE3EC" BorderThickness="1" CornerRadius="12" Padding="18" Margin="7,0,0,14"><Grid><Grid.ColumnDefinitions><ColumnDefinition Width="Auto"/><ColumnDefinition/></Grid.ColumnDefinitions><Ellipse x:Name="ServiceTitanDot" xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml" Width="12" Height="12" Fill="#D97706" Margin="0,6,12,0" VerticalAlignment="Top"/><StackPanel Grid.Column="1"><TextBlock Text="SERVICETITAN DATA" Foreground="#758397" FontSize="10" FontWeight="SemiBold"/><TextBlock x:Name="ServiceTitanState" Text="Checking" FontSize="20" FontWeight="SemiBold" Margin="0,4,0,0"/><TextBlock x:Name="ServiceTitanDetail" Foreground="#647287" FontSize="12" Margin="0,4,0,0" TextWrapping="Wrap"/></StackPanel></Grid></Border>
<Border Background="White" BorderBrush="#DCE3EC" BorderThickness="1" CornerRadius="12" Padding="18" Margin="0,0,7,14"><Grid><Grid.ColumnDefinitions><ColumnDefinition Width="Auto"/><ColumnDefinition/></Grid.ColumnDefinitions><Ellipse x:Name="CacheDot" xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml" Width="12" Height="12" Fill="#D97706" Margin="0,6,12,0" VerticalAlignment="Top"/><StackPanel Grid.Column="1"><TextBlock Text="DASHBOARD CACHE" Foreground="#758397" FontSize="10" FontWeight="SemiBold"/><TextBlock x:Name="CacheState" Text="Checking" FontSize="20" FontWeight="SemiBold" Margin="0,4,0,0"/><TextBlock x:Name="CacheDetail" Foreground="#647287" FontSize="12" Margin="0,4,0,0" TextWrapping="Wrap"/></StackPanel></Grid></Border>
<Border Background="White" BorderBrush="#DCE3EC" BorderThickness="1" CornerRadius="12" Padding="18" Margin="7,0,0,14"><Grid><Grid.ColumnDefinitions><ColumnDefinition Width="Auto"/><ColumnDefinition/></Grid.ColumnDefinitions><Ellipse x:Name="DisplayDot" xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml" Width="12" Height="12" Fill="#D97706" Margin="0,6,12,0" VerticalAlignment="Top"/><StackPanel Grid.Column="1"><TextBlock Text="TV DISPLAYS" Foreground="#758397" FontSize="10" FontWeight="SemiBold"/><TextBlock x:Name="DisplayState" Text="Checking" FontSize="20" FontWeight="SemiBold" Margin="0,4,0,0"/><TextBlock x:Name="DisplayDetail" Foreground="#647287" FontSize="12" Margin="0,4,0,0" TextWrapping="Wrap"/></StackPanel></Grid></Border>
</UniformGrid>
<Border Background="White" BorderBrush="#DCE3EC" BorderThickness="1" CornerRadius="12" Padding="20"><StackPanel><TextBlock Text="DETAILS" Foreground="#758397" FontSize="10" FontWeight="SemiBold"/><Grid Margin="0,12,0,0"><Grid.ColumnDefinitions><ColumnDefinition/><ColumnDefinition/></Grid.ColumnDefinitions><StackPanel><TextBlock Text="Last successful refresh" Foreground="#758397" FontSize="11"/><TextBlock x:Name="LastRefresh" FontSize="14" FontWeight="SemiBold" Margin="0,3,0,12"/><TextBlock Text="Last failure" Foreground="#758397" FontSize="11"/><TextBlock x:Name="LastFailure" FontSize="14" FontWeight="SemiBold" Margin="0,3,0,0"/></StackPanel><StackPanel Grid.Column="1"><TextBlock Text="Browser reconnect attempts" Foreground="#758397" FontSize="11"/><TextBlock x:Name="ReconnectAttempts" FontSize="14" FontWeight="SemiBold" Margin="0,3,0,12"/><TextBlock Text="Session token observation" Foreground="#758397" FontSize="11"/><TextBlock x:Name="TokenState" FontSize="14" FontWeight="SemiBold" Margin="0,3,0,0"/></StackPanel></Grid></StackPanel></Border>
</StackPanel></ScrollViewer>
<Border Grid.Row="2" Background="#EBEFF5" BorderBrush="#DDE4EC" BorderThickness="0,1,0,0"><Button x:Name="Close" xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml" Content="Close" Width="110" Height="34" HorizontalAlignment="Right" Margin="0,0,28,0"/></Border>
</Grid></Window>
'@
    $dialog=[Windows.Markup.XamlReader]::Load((New-Object Xml.XmlNodeReader $markup));$dialog.Owner=$window
    function D($name){$dialog.FindName($name)}
    $green=[Windows.Media.BrushConverter]::new().ConvertFromString('#198754');$amber=[Windows.Media.BrushConverter]::new().ConvertFromString('#D97706')
    (D 'GeneratedAt').Text="Updated $(Get-Date -Format 'MMM d, yyyy h:mm:ss tt')"
    $browser=$data.diagnostics.browser;$browserOk=$browser.connected -and $browser.serviceTitanPageFound
    (D 'BrowserDot').Fill=if($browserOk){$green}else{$amber};(D 'BrowserState').Text=if($browserOk){'Connected'}else{'Needs attention'};(D 'BrowserDetail').Text=if($browserOk){'Dedicated Edge is connected to the approved ServiceTitan page.'}else{'The dedicated browser or ServiceTitan page is unavailable.'}
    $serviceTitan=$data.diagnostics.serviceTitan;$serviceTitanOk=$serviceTitan.status -eq 'connected'
    (D 'ServiceTitanDot').Fill=if($serviceTitanOk){$green}else{$amber};(D 'ServiceTitanState').Text=if($serviceTitanOk){'Connected'}else{'Unavailable'};(D 'ServiceTitanDetail').Text=if($serviceTitanOk){'Authenticated data requests are available.'}else{"Current status: $($serviceTitan.status)"}
    $cacheOk=$data.diagnostics.cacheAvailable -and -not $data.diagnostics.cacheStale
    (D 'CacheDot').Fill=if($cacheOk){$green}else{$amber};(D 'CacheState').Text=if($cacheOk){'Current'}elseif($data.diagnostics.cacheAvailable){'Stale'}else{'Waiting for data'}
    $age=if($null-ne$data.diagnostics.cacheAgeMilliseconds){[Math]::Floor($data.diagnostics.cacheAgeMilliseconds/1000)}else{$null};(D 'CacheDetail').Text=if($null-ne$age){"Latest cached dashboard data is $age seconds old."}else{'No successful dashboard refresh is cached yet.'}
    $displayCount=@($data.displays).Count;$onlineCount=@($data.displays|Where-Object{$_.displayOnline}).Count;$displaysOk=$displayCount -gt 0 -and $onlineCount -eq $displayCount
    (D 'DisplayDot').Fill=if($displaysOk){$green}else{$amber};(D 'DisplayState').Text="$onlineCount of $displayCount online";(D 'DisplayDetail').Text=if($displaysOk){'Every configured display is reporting normally.'}else{'One or more configured displays need attention.'}
    (D 'LastRefresh').Text=if($data.diagnostics.lastSuccessfulRefreshAt){([DateTimeOffset]::Parse($data.diagnostics.lastSuccessfulRefreshAt).ToLocalTime().ToString('MMM d, yyyy h:mm:ss tt'))}else{'No successful refresh yet'}
    (D 'LastFailure').Text=if($data.diagnostics.lastFailureCode){$data.diagnostics.lastFailureCode}else{'None'}
    (D 'ReconnectAttempts').Text=[string]$browser.reconnectAttempt
    (D 'TokenState').Text=if($serviceTitan.sessionToken.available){'Available and observed in memory'}elseif($serviceTitan.sessionToken.acquiring){'Acquiring'}else{'Not available'}
    (D 'Close').Add_Click({$dialog.Close()});[void]$dialog.ShowDialog()
  } catch { Show-GrMetroResult -Title "Admin Diagnostics" -Message "Diagnostics are unavailable: $($_.Exception.Message)" -Success $false }
}

function Show-NativeRecoveryLogs {
  param([string]$LogPath)
  [xml]$markup=@'
<Window xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation" xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml" Title="GRMetro Recovery Logs" Width="900" Height="680" MinWidth="760" MinHeight="560" WindowStartupLocation="CenterOwner" Background="#F4F7FB" FontFamily="Segoe UI" Foreground="#172033">
<Grid><Grid.RowDefinitions><RowDefinition Height="104"/><RowDefinition Height="*"/><RowDefinition Height="58"/></Grid.RowDefinitions>
<Border Background="#172033"><Grid Margin="28,0"><StackPanel VerticalAlignment="Center"><TextBlock Text="RECOVERY CENTER" Foreground="#75B8F4" FontSize="11" FontWeight="SemiBold"/><TextBlock Text="Supervisor activity" Foreground="White" FontSize="27" FontWeight="SemiBold"/><TextBlock Text="Startup, recovery, and operator events from this installation" Foreground="#AEBCCE" FontSize="12"/></StackPanel><Border HorizontalAlignment="Right" VerticalAlignment="Center" Background="#26364C" CornerRadius="15" Padding="12,6"><TextBlock x:Name="Summary" Foreground="White" FontWeight="SemiBold"/></Border></Grid></Border>
<ListBox x:Name="Entries" Grid.Row="1" Margin="28,20" Background="Transparent" BorderThickness="0" ScrollViewer.HorizontalScrollBarVisibility="Disabled"/>
<Border Grid.Row="2" Background="#EBEFF5" BorderBrush="#DDE4EC" BorderThickness="0,1,0,0"><Button x:Name="Close" Content="Close" Width="110" Height="34" HorizontalAlignment="Right" Margin="0,0,28,0"/></Border>
</Grid></Window>
'@
  $dialog=[Windows.Markup.XamlReader]::Load((New-Object Xml.XmlNodeReader $markup));$dialog.Owner=$window;$entries=$dialog.FindName('Entries')
  $lines=if(Test-Path $LogPath){@(Get-Content -LiteralPath $LogPath -Tail 200)}else{@()}
  foreach($line in @($lines|Select-Object -Last 100|Sort-Object -Descending)){
    $time='';$severity='INFO';$level='0';$event='Activity';$message=$line
    if($line-match'^(\S+) \[([^\]]+)\] L(\d+) ([^:]+): (.*)$'){$time=$matches[1];$severity=$matches[2];$level=$matches[3];$event=$matches[4];$message=$matches[5]}
    try{$timeText=([DateTimeOffset]::Parse($time).ToLocalTime().ToString('MMM d, h:mm:ss tt'))}catch{$timeText=$time}
    $accent=switch($severity){'ERROR'{'#B42318'}'WARN'{'#D97706'}'RECOVERED'{'#198754'}default{'#0F6CBD'}}
    $card=New-Object System.Windows.Controls.Border;$card.Background='White';$card.BorderBrush='#DCE3EC';$card.BorderThickness=1;$card.CornerRadius=10;$card.Padding=14;$card.Margin='0,0,0,10';$card.HorizontalAlignment='Stretch'
    $grid=New-Object System.Windows.Controls.Grid;$grid.ColumnDefinitions.Add((New-Object System.Windows.Controls.ColumnDefinition -Property @{Width='96'}));$grid.ColumnDefinitions.Add((New-Object System.Windows.Controls.ColumnDefinition -Property @{Width='*'}))
    $pill=New-Object System.Windows.Controls.Border;$pill.Background=$accent;$pill.CornerRadius=10;$pill.Padding='8,3';$pill.HorizontalAlignment='Left';$pill.VerticalAlignment='Top'
    $pillText=New-Object System.Windows.Controls.TextBlock;$pillText.Text=$severity;$pillText.Foreground='White';$pillText.FontSize=10;$pillText.FontWeight='SemiBold';$pill.Child=$pillText;$grid.Children.Add($pill)|Out-Null
    $content=New-Object System.Windows.Controls.StackPanel;[System.Windows.Controls.Grid]::SetColumn($content,1)
    $title=New-Object System.Windows.Controls.TextBlock;$title.Text=$message;$title.FontSize=14;$title.FontWeight='SemiBold';$title.TextWrapping='Wrap';$content.Children.Add($title)|Out-Null
    $meta=New-Object System.Windows.Controls.TextBlock;$meta.Text="$timeText - $event - Recovery level $level";$meta.Foreground='#758397';$meta.FontSize=11;$meta.Margin='0,5,0,0';$content.Children.Add($meta)|Out-Null;$grid.Children.Add($content)|Out-Null;$card.Child=$grid;$entries.Items.Add($card)|Out-Null
  }
  if($lines.Count -eq 0){$empty=New-Object System.Windows.Controls.TextBlock;$empty.Text='No recovery activity has been recorded yet.';$empty.Foreground='#647287';$empty.FontSize=15;$empty.HorizontalAlignment='Center';$empty.Margin=30;$entries.Items.Add($empty)|Out-Null}
  ($dialog.FindName('Summary')).Text="$($lines.Count) recent events";($dialog.FindName('Close')).Add_Click({$dialog.Close()});[void]$dialog.ShowDialog()
}
