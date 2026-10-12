# Stable launch integration shared by Setup, autostart management, and Control Center.
# Loading this file performs no shortcut or scheduled-task changes.
$script:GrMetroAutostartTaskName='GRMetro Live Performance Center Supervisor'

function Get-GrMetroUpdateHostExecutable([string]$InstallRoot) {
  $install=[IO.Path]::GetFullPath($InstallRoot).TrimEnd('\')
  $expectedParent=[IO.Path]::GetFullPath((Join-Path $env:LOCALAPPDATA 'GRMetro')).TrimEnd('\')
  if([IO.Path]::GetDirectoryName($install)-ne$expectedParent-or[IO.Path]::GetFileName($install)-ne'Performance Center'){throw 'GRMetro installation root is not the expected per-user application directory.'}
  $hostPath=[IO.Path]::GetFullPath((Join-Path $expectedParent 'Update Host\GRMetro Update Host.exe'))
  if([IO.Path]::GetDirectoryName([IO.Path]::GetDirectoryName($hostPath))-ne$expectedParent){throw 'GRMetro Update Host path is unsafe.'}
  return $hostPath
}

function Get-GrMetroLaunchIntegrationPaths([string]$InstallRoot,[string]$DesktopPath=$null,[string]$StartMenuRoot=$null) {
  if(-not$DesktopPath){$DesktopPath=[Environment]::GetFolderPath('Desktop')}
  if(-not$StartMenuRoot){$StartMenuRoot=Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu\Programs\GRMetro'}
  $hostPath=Get-GrMetroUpdateHostExecutable $InstallRoot
  return [pscustomobject]@{HostExecutable=$hostPath;HostRoot=[IO.Path]::GetDirectoryName($hostPath);ApplicationExecutable=(Join-Path ([IO.Path]::GetFullPath($InstallRoot).TrimEnd('\')) 'GRMetro Performance Center.exe');DesktopShortcut=(Join-Path $DesktopPath 'GRMetro Performance Center.lnk');StartMenuRoot=$StartMenuRoot;StartMenuShortcut=(Join-Path $StartMenuRoot 'GRMetro Performance Center.lnk');TaskName=$script:GrMetroAutostartTaskName}
}

function Save-GrMetroLaunchIntegrationState([string]$InstallRoot,[string]$DesktopPath=$null,[string]$StartMenuRoot=$null) {
  $paths=Get-GrMetroLaunchIntegrationPaths $InstallRoot $DesktopPath $StartMenuRoot
  $shortcuts=@();foreach($path in @($paths.DesktopShortcut,$paths.StartMenuShortcut)){$exists=Test-Path -LiteralPath $path -PathType Leaf;$shortcuts+=,[pscustomobject]@{Path=$path;Existed=[bool]$exists;Bytes=$(if($exists){[IO.File]::ReadAllBytes($path)}else{$null})}}
  $task=Get-ScheduledTask -TaskName $paths.TaskName -ErrorAction SilentlyContinue;$taskXml=if($task){Export-ScheduledTask -TaskName $paths.TaskName}else{$null}
  return [pscustomobject]@{Paths=$paths;Shortcuts=$shortcuts;TaskExisted=[bool]$task;TaskXml=$taskXml}
}

function New-GrMetroHostShortcut([string]$Path,$Paths) {
  New-Item -ItemType Directory -Force -Path ([IO.Path]::GetDirectoryName($Path))|Out-Null
  $shell=New-Object -ComObject WScript.Shell;$shortcut=$shell.CreateShortcut($Path)
  $shortcut.TargetPath=$Paths.HostExecutable;$shortcut.Arguments='-Mode Launch';$shortcut.WorkingDirectory=$Paths.HostRoot;$shortcut.Description='GRMetro Live Performance Center'
  if(Test-Path -LiteralPath $Paths.ApplicationExecutable -PathType Leaf){$shortcut.IconLocation="$($Paths.ApplicationExecutable),0"}
  $shortcut.Save()
}

function Register-GrMetroHostAutostart([string]$InstallRoot,[string]$TaskName=$script:GrMetroAutostartTaskName) {
  $paths=Get-GrMetroLaunchIntegrationPaths $InstallRoot
  if(-not(Test-Path -LiteralPath $paths.HostExecutable -PathType Leaf)){throw 'The stable GRMetro Update Host is missing.'}
  $action=New-ScheduledTaskAction -Execute $paths.HostExecutable -Argument '-Mode Launch' -WorkingDirectory $paths.HostRoot
  $trigger=New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
  $settings=New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1) -ExecutionTimeLimit ([TimeSpan]::Zero)
  $principal=New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Highest
  Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Description 'Launches the stable GRMetro Update Host, recovers any pending application transaction, then starts the Performance Center.' -Force|Out-Null
}

function Set-GrMetroLaunchIntegration([string]$InstallRoot,[bool]$AutostartEnabled,[string]$DesktopPath=$null,[string]$StartMenuRoot=$null) {
  $paths=Get-GrMetroLaunchIntegrationPaths $InstallRoot $DesktopPath $StartMenuRoot
  if(-not(Test-Path -LiteralPath $paths.HostExecutable -PathType Leaf)){throw 'The stable GRMetro Update Host is missing.'}
  New-GrMetroHostShortcut $paths.DesktopShortcut $paths;New-GrMetroHostShortcut $paths.StartMenuShortcut $paths
  if($AutostartEnabled){Register-GrMetroHostAutostart $InstallRoot $paths.TaskName}else{Unregister-ScheduledTask -TaskName $paths.TaskName -Confirm:$false -ErrorAction SilentlyContinue}
  return $paths
}

function Restore-GrMetroLaunchIntegration($State) {
  if(-not$State){return}
  foreach($shortcut in @($State.Shortcuts)){if($shortcut.Existed){New-Item -ItemType Directory -Force -Path ([IO.Path]::GetDirectoryName($shortcut.Path))|Out-Null;[IO.File]::WriteAllBytes($shortcut.Path,[byte[]]$shortcut.Bytes)}elseif(Test-Path -LiteralPath $shortcut.Path){Remove-Item -LiteralPath $shortcut.Path -Force}}
  if($State.TaskExisted){Register-ScheduledTask -TaskName $State.Paths.TaskName -Xml ([string]$State.TaskXml) -Force|Out-Null}else{Unregister-ScheduledTask -TaskName $State.Paths.TaskName -Confirm:$false -ErrorAction SilentlyContinue}
}
