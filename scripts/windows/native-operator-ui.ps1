$ErrorActionPreference = "Stop"

function Show-GrMetroTextDialog {
  param([string]$Title,[string]$Heading,[string]$Text,[string]$ActionLabel="Close")
  $dialog = New-Object System.Windows.Window
  $dialog.Title = $Title
  $dialog.Width = 780
  $dialog.Height = 620
  $dialog.MinWidth = 620
  $dialog.MinHeight = 420
  $dialog.WindowStartupLocation = "CenterOwner"
  $dialog.Owner = $window
  $dialog.Background = [Windows.Media.BrushConverter]::new().ConvertFromString("#F4F7FB")
  $grid = New-Object System.Windows.Controls.Grid
  $grid.Margin = 24
  $grid.RowDefinitions.Add((New-Object System.Windows.Controls.RowDefinition -Property @{Height="Auto"}))
  $grid.RowDefinitions.Add((New-Object System.Windows.Controls.RowDefinition -Property @{Height="*"}))
  $grid.RowDefinitions.Add((New-Object System.Windows.Controls.RowDefinition -Property @{Height="Auto"}))
  $head = New-Object System.Windows.Controls.TextBlock
  $head.Text=$Heading; $head.FontSize=24; $head.FontWeight="SemiBold"; $head.Margin="0,0,0,16"
  [System.Windows.Controls.Grid]::SetRow($head,0); $grid.Children.Add($head)|Out-Null
  $box = New-Object System.Windows.Controls.TextBox
  $box.Text=$Text; $box.IsReadOnly=$true; $box.AcceptsReturn=$true; $box.TextWrapping="NoWrap"; $box.VerticalScrollBarVisibility="Auto"; $box.HorizontalScrollBarVisibility="Auto"; $box.FontFamily="Consolas"; $box.FontSize=12; $box.Padding=12; $box.Background="White"; $box.BorderBrush="#DCE3EC"
  [System.Windows.Controls.Grid]::SetRow($box,1); $grid.Children.Add($box)|Out-Null
  $close = New-Object System.Windows.Controls.Button
  $close.Content=$ActionLabel; $close.Width=110; $close.Height=36; $close.HorizontalAlignment="Right"; $close.Margin="0,16,0,0"
  $close.Add_Click({$dialog.Close()})
  [System.Windows.Controls.Grid]::SetRow($close,2); $grid.Children.Add($close)|Out-Null
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

function Show-NativeRemoteAccess {
  param([string]$RemoteUrl,[string]$Root)
  $qrScript=Join-Path $Root "scripts\show-remote-qr.js"
  $qr=""
  if(Test-Path $qrScript){
    try { $qr = (& node $qrScript $RemoteUrl 2>&1 | Out-String).TrimEnd() } catch { $qr="QR renderer unavailable." }
  }
  $text = "$RemoteUrl`r`n`r`nScan this QR code with your phone:`r`n`r`n$qr"
  Show-GrMetroTextDialog -Title "GRMetro Phone Remote" -Heading "Phone Remote" -Text $text
}

function Show-NativeDiagnostics {
  try {
    $data=Invoke-RestMethod "http://127.0.0.1:3000/api/v1/admin" -TimeoutSec 5
    $text=$data|ConvertTo-Json -Depth 10
    Show-GrMetroTextDialog -Title "GRMetro Diagnostics" -Heading "Admin Diagnostics" -Text $text
  } catch { Show-GrMetroResult -Title "Admin Diagnostics" -Message "Diagnostics are unavailable: $($_.Exception.Message)" -Success $false }
}

function Show-NativeRecoveryLogs {
  param([string]$LogPath)
  $text=if(Test-Path $LogPath){Get-Content $LogPath -Tail 500|Out-String}else{"No recovery log has been created yet."}
  Show-GrMetroTextDialog -Title "GRMetro Recovery Logs" -Heading "Recovery Logs" -Text $text
}
