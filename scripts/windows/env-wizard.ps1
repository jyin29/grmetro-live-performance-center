param([switch]$Force)
$ErrorActionPreference="Stop"
Add-Type -AssemblyName PresentationFramework,PresentationCore,WindowsBase
$root=(Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$envPath=Join-Path $root ".env"
$example=Join-Path $root ".env.example"
if(-not(Test-Path $example)){throw "Missing .env.example"}
function Read-EnvMap([string]$path){$map=@{};if(Test-Path $path){foreach($line in Get-Content $path){if($line -match '^\s*([^#=\s]+)=(.*)$'){$map[$matches[1]]=$matches[2]}}};return $map}
function Set-EnvValue([string[]]$lines,[string]$key,[string]$value){$found=$false;$result=@();foreach($line in $lines){if($line -match ('^\s*'+[regex]::Escape($key)+'=')){$result+="$key=$value";$found=$true}else{$result+=$line}};if(-not$found){$result+="$key=$value"};return $result}
$current=Read-EnvMap $envPath
if(-not$Force -and $current['SERVICETITAN_BUSINESS_UNIT_IDS'] -and $current['SERVICETITAN_TECHNICIANS_JSON']){exit 0}
[xml]$xaml=@'
<Window xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation" Title="GRMetro Setup" Width="680" Height="600" WindowStartupLocation="CenterScreen" ResizeMode="NoResize" Background="#F5F7FA" FontFamily="Segoe UI">
<Grid Margin="28"><Grid.RowDefinitions><RowDefinition Height="Auto"/><RowDefinition Height="*"/><RowDefinition Height="Auto"/></Grid.RowDefinitions>
<StackPanel><TextBlock Text="GRMetro Performance Center" FontSize="26" FontWeight="SemiBold" Foreground="#142031"/><TextBlock Text="First-time configuration" Margin="0,6,0,22" FontSize="14" Foreground="#637083"/></StackPanel>
<Border Grid.Row="1" Background="White" CornerRadius="12" BorderBrush="#D7DEE8" BorderThickness="1" Padding="22"><StackPanel>
<TextBlock Text="ServiceTitan business unit IDs" FontWeight="SemiBold"/><TextBlock Text="Comma-separated numeric IDs" Foreground="#7A8796" FontSize="12" Margin="0,2,0,6"/><TextBox x:Name="BusinessUnits" Height="34" Padding="8,5"/>
<TextBlock Text="Technician configuration" FontWeight="SemiBold" Margin="0,18,0,0"/><TextBlock Text='JSON array, for example [{"id":123,"name":"Tech One","shortName":"Tech One","initials":"TO"}]' TextWrapping="Wrap" Foreground="#7A8796" FontSize="12" Margin="0,2,0,6"/><TextBox x:Name="Technicians" Height="150" Padding="8" AcceptsReturn="True" TextWrapping="Wrap" VerticalScrollBarVisibility="Auto"/>
<TextBlock Text="Timezone" FontWeight="SemiBold" Margin="0,18,0,6"/><TextBox x:Name="Timezone" Height="34" Padding="8,5"/>
<CheckBox x:Name="Autostart" Content="Start GRMetro automatically when I sign in to Windows" Margin="0,20,0,0" IsChecked="True"/>
<TextBlock x:Name="ErrorText" Foreground="#B42318" Margin="0,14,0,0" TextWrapping="Wrap"/>
</StackPanel></Border>
<Grid Grid.Row="2" Margin="0,20,0,0"><Grid.ColumnDefinitions><ColumnDefinition/><ColumnDefinition Width="Auto"/></Grid.ColumnDefinitions><Button x:Name="Cancel" Content="Cancel" Width="100" Height="38" HorizontalAlignment="Left"/><Button x:Name="Save" Content="Save and Continue" Width="150" Height="38" Grid.Column="1" Background="#1570EF" Foreground="White" BorderThickness="0" FontWeight="SemiBold"/></Grid>
</Grid></Window>
'@
$reader=New-Object System.Xml.XmlNodeReader $xaml
$window=[Windows.Markup.XamlReader]::Load($reader)
$bu=$window.FindName("BusinessUnits");$tech=$window.FindName("Technicians");$tz=$window.FindName("Timezone");$auto=$window.FindName("Autostart");$errorText=$window.FindName("ErrorText")
$bu.Text=$current['SERVICETITAN_BUSINESS_UNIT_IDS'];$tech.Text=$current['SERVICETITAN_TECHNICIANS_JSON'];$tz.Text=if($current['TIMEZONE']){$current['TIMEZONE']}else{"America/New_York"}
$script:saved=$false
$window.FindName("Cancel").Add_Click({$window.Close()})
$window.FindName("Save").Add_Click({
  $errorText.Text=""
  if($bu.Text -notmatch '^\s*\d+(\s*,\s*\d+)*\s*$'){$errorText.Text="Enter one or more numeric business unit IDs separated by commas.";return}
  try{$parsed=$tech.Text|ConvertFrom-Json;if($null -eq $parsed -or @($parsed).Count -lt 1){throw "array"}}catch{$errorText.Text="Technician configuration must be a non-empty valid JSON array.";return}
  $lines=if(Test-Path $envPath){@(Get-Content $envPath)}else{@(Get-Content $example)}
  $lines=@(Set-EnvValue $lines "SERVICETITAN_BUSINESS_UNIT_IDS" $bu.Text.Trim())
  $lines=@(Set-EnvValue $lines "SERVICETITAN_TECHNICIANS_JSON" (($tech.Text|ConvertFrom-Json|ConvertTo-Json -Compress -Depth 10)))
  $lines=@(Set-EnvValue $lines "TIMEZONE" $tz.Text.Trim())
  Set-Content -Path $envPath -Value $lines -Encoding UTF8
  Set-Content -Path (Join-Path $root ".grmetro-autostart-choice") -Value ($(if($auto.IsChecked){"yes"}else{"no"})) -Encoding ASCII
  $script:saved=$true;$window.DialogResult=$true;$window.Close()
})
[void]$window.ShowDialog()
if(-not$script:saved){exit 2}
