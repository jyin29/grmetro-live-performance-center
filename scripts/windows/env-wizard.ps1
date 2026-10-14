param([switch]$Force,[switch]$ValidateOnly)
$ErrorActionPreference="Stop"
trap {
  [Console]::Error.WriteLine("GRMetro configuration wizard initialization failed: $($_.Exception.Message)")
  if($_.ScriptStackTrace){[Console]::Error.WriteLine($_.ScriptStackTrace)}
  exit 1
}
Add-Type -AssemblyName PresentationFramework,PresentationCore,WindowsBase
$root=(Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$envPath=Join-Path $root ".env"
$example=Join-Path $root ".env.example"
if(-not(Test-Path $example)){throw "Missing .env.example"}
function Read-EnvMap([string]$path){$map=@{};if(Test-Path $path){foreach($line in Get-Content $path){if($line -match '^\s*([^#=\s]+)=(.*)$'){$map[$matches[1]]=$matches[2]}}};return $map}
function Set-EnvValue([string[]]$lines,[string]$key,[string]$value){$found=$false;$result=@();foreach($line in $lines){if($line -match ('^\s*'+[regex]::Escape($key)+'=')){$result+="$key=$value";$found=$true}else{$result+=$line}};if(-not$found){$result+="$key=$value"};return $result}
function Convert-TechnicianConfigurationJson([string]$value){
  $parsed=$value|ConvertFrom-Json
  $items=$null
  if($parsed -is [array]){$items=@($parsed)}
  elseif($parsed -and @($parsed.PSObject.Properties.Name|Sort-Object)-join'|' -eq 'Count|value' -and $parsed.value -is [array] -and $parsed.Count -is [int] -and [int]$parsed.Count -eq @($parsed.value).Count){$items=@($parsed.value)}
  else{throw 'unsupported'}
  if($items.Count-lt1){throw 'empty'}
  foreach($item in $items){if(-not($item.id)-or-not([string]$item.name).Trim()){throw 'record'}}
  return ConvertTo-Json -InputObject @($items) -Compress -Depth 10
}
function Get-AutostartChoice([Nullable[bool]]$isChecked){if($isChecked -eq $true){return "yes"};return "no"}
function Get-FirewallChoice([Nullable[bool]]$isChecked){if($isChecked -eq $true){return "yes"};return "no"}
$current=Read-EnvMap $envPath
if(-not$Force -and $current['SERVICETITAN_BUSINESS_UNIT_IDS'] -and $current['SERVICETITAN_TECHNICIANS_JSON']){exit 0}
[xml]$xaml=@'
<Window xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation" xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml" Title="GRMetro Setup" Width="680" Height="600" WindowStartupLocation="CenterScreen" ResizeMode="NoResize" Background="#F5F7FA" FontFamily="Segoe UI">
<Grid Margin="28"><Grid.RowDefinitions><RowDefinition Height="Auto"/><RowDefinition Height="*"/><RowDefinition Height="Auto"/></Grid.RowDefinitions>
<StackPanel><TextBlock Text="GRMetro Performance Center" FontSize="26" FontWeight="SemiBold" Foreground="#142031"/><TextBlock Text="First-time configuration" Margin="0,6,0,22" FontSize="14" Foreground="#637083"/></StackPanel>
<Border Grid.Row="1" Background="White" CornerRadius="12" BorderBrush="#D7DEE8" BorderThickness="1" Padding="22"><StackPanel>
<TextBlock Text="ServiceTitan business unit IDs" FontWeight="SemiBold"/><TextBlock Text="Comma-separated numeric IDs" Foreground="#7A8796" FontSize="12" Margin="0,2,0,6"/><TextBox x:Name="BusinessUnits" Height="34" Padding="8,5"/>
<TextBlock Text="Technician configuration" FontWeight="SemiBold" Margin="0,18,0,0"/><TextBlock Text='JSON array, for example [{"id":123,"name":"Tech One","shortName":"Tech One","initials":"TO"}]' TextWrapping="Wrap" Foreground="#7A8796" FontSize="12" Margin="0,2,0,6"/><TextBox x:Name="Technicians" Height="150" Padding="8" AcceptsReturn="True" TextWrapping="Wrap" VerticalScrollBarVisibility="Auto"/>
<TextBlock Text="Timezone" FontWeight="SemiBold" Margin="0,18,0,6"/><TextBox x:Name="Timezone" Height="34" Padding="8,5"/>
<CheckBox x:Name="Autostart" Content="Start GRMetro automatically when I sign in to Windows" Margin="0,20,0,0" IsChecked="False"/>
<CheckBox x:Name="Firewall" Content="Allow phones and TVs on my private network to connect" Margin="0,10,0,0" IsChecked="True"/>
<TextBlock x:Name="ErrorText" Foreground="#B42318" Margin="0,14,0,0" TextWrapping="Wrap"/>
</StackPanel></Border>
<Grid Grid.Row="2" Margin="0,20,0,0"><Grid.ColumnDefinitions><ColumnDefinition/><ColumnDefinition Width="Auto"/></Grid.ColumnDefinitions><Button x:Name="Cancel" Content="Cancel" Width="100" Height="38" HorizontalAlignment="Left"/><Button x:Name="Save" Content="Save and Continue" Width="150" Height="38" Grid.Column="1" Background="#1570EF" Foreground="White" BorderThickness="0" FontWeight="SemiBold"/></Grid>
</Grid></Window>
'@
$reader=New-Object System.Xml.XmlNodeReader $xaml
$window=[Windows.Markup.XamlReader]::Load($reader)
$bu=$window.FindName("BusinessUnits");$tech=$window.FindName("Technicians");$tz=$window.FindName("Timezone");$auto=$window.FindName("Autostart");$firewall=$window.FindName("Firewall");$errorText=$window.FindName("ErrorText")
foreach($control in @($bu,$tech,$tz,$auto,$firewall,$errorText,$window.FindName("Save"),$window.FindName("Cancel"))){if($null-eq$control){throw "Configuration wizard markup is missing a required control."}}
$bu.Text=$current['SERVICETITAN_BUSINESS_UNIT_IDS'];$tech.Text=try{Convert-TechnicianConfigurationJson $current['SERVICETITAN_TECHNICIANS_JSON']}catch{$current['SERVICETITAN_TECHNICIANS_JSON']};$tz.Text=if($current['TIMEZONE']){$current['TIMEZONE']}else{"America/New_York"}
$autostartPath=Join-Path $root ".grmetro-autostart-choice"
if(Test-Path $autostartPath){$auto.IsChecked=((Get-Content -LiteralPath $autostartPath -Raw).Trim() -eq "yes")}
$firewallPath=Join-Path $root ".grmetro-firewall-choice"
if(Test-Path $firewallPath){$firewall.IsChecked=((Get-Content -LiteralPath $firewallPath -Raw).Trim() -eq "yes")}
$script:saved=$false
$window.FindName("Cancel").Add_Click({$window.Close()})
$window.FindName("Save").Add_Click({
  $errorText.Text=""
  if($bu.Text -notmatch '^\s*\d+(\s*,\s*\d+)*\s*$'){$errorText.Text="Enter one or more numeric business unit IDs separated by commas.";return}
  try{$techniciansJson=Convert-TechnicianConfigurationJson $tech.Text}catch{$errorText.Text="Technician configuration must be a non-empty valid JSON array or supported legacy wrapper.";return}
  $lines=if(Test-Path $envPath){@(Get-Content $envPath)}else{@(Get-Content $example)}
  $lines=@(Set-EnvValue $lines "SERVICETITAN_BUSINESS_UNIT_IDS" $bu.Text.Trim())
  $lines=@(Set-EnvValue $lines "SERVICETITAN_TECHNICIANS_JSON" $techniciansJson)
  $lines=@(Set-EnvValue $lines "TIMEZONE" $tz.Text.Trim())
  Set-Content -Path $envPath -Value $lines -Encoding UTF8
  Set-Content -LiteralPath $autostartPath -Value (Get-AutostartChoice $auto.IsChecked) -Encoding ASCII
  Set-Content -LiteralPath $firewallPath -Value (Get-FirewallChoice $firewall.IsChecked) -Encoding ASCII
  $script:saved=$true;$window.DialogResult=$true;$window.Close()
})
if($ValidateOnly){$window.Close();Write-Output "GRMetro configuration wizard validation passed.";exit 0}
[void]$window.ShowDialog()
if(-not$script:saved){exit 2}
