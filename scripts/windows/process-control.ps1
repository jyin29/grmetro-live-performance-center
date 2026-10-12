# Shared GRMetro process control for Setup and the external Update Host.
# Loading this file performs no process or scheduled-task changes.

function Get-GrMetroOwnedUpgradeProcesses([string]$InstallRoot) {
  $root=[IO.Path]::GetFullPath($InstallRoot).TrimEnd('\')
  $runtimeNode=Join-Path $root 'runtime\node\node.exe'
  $launcherExe=Join-Path $root 'GRMetro Performance Center.exe'
  $owned=@()
  foreach($process in @(Get-CimInstance Win32_Process -ErrorAction SilentlyContinue)){
    $name=[string]$process.Name
    $command=[string]$process.CommandLine
    $executable=[string]$process.ExecutablePath
    $role=$null
    $insideRoot=$command.IndexOf($root,[StringComparison]::OrdinalIgnoreCase)-ge 0
    if($name -ieq 'GRMetro Performance Center.exe' -and $executable -ieq $launcherExe){$role='operator'}
    elseif($name -ieq 'node.exe' -and (($executable -ieq $runtimeNode)-or($insideRoot -and $command -match 'apps[\\/]backend[\\/]src[\\/]index\.js'))){$role='backend'}
    elseif($name -ieq 'powershell.exe' -and $insideRoot -and $command -match 'performance-center-supervisor\.ps1|start-supervised-performance-center\.ps1'){$role='supervisor'}
    elseif($name -ieq 'powershell.exe' -and $insideRoot -and $command -match 'performance-center-launcher-(?:host|v2)\.ps1'){$role='operator'}
    if($role -and [int]$process.ProcessId -ne $PID){
      $owned+=[pscustomobject]@{ProcessId=[int]$process.ProcessId;Role=$role;Name=$name;ExecutablePath=$executable}
    }
  }
  return @($owned)
}

function Stop-GrMetroUpgradeProcesses([string]$InstallRoot) {
  $owned=@(Get-GrMetroOwnedUpgradeProcesses $InstallRoot)
  $state=[pscustomobject]@{
    OperatorWasRunning=[bool]@($owned|Where-Object{$_.Role -eq 'operator'})
    RuntimeWasRunning=[bool]@($owned|Where-Object{$_.Role -in @('supervisor','backend')})
  }
  try{Stop-ScheduledTask -TaskName 'GRMetro Live Performance Center Supervisor' -ErrorAction SilentlyContinue}catch{}
  foreach($role in @('supervisor','operator','backend')){
    foreach($process in @($owned|Where-Object{$_.Role -eq $role})){
      Stop-Process -Id $process.ProcessId -Force -ErrorAction SilentlyContinue
    }
  }
  $deadline=(Get-Date).AddSeconds(12)
  do{
    $remaining=@(Get-GrMetroOwnedUpgradeProcesses $InstallRoot)
    if(-not$remaining){return $state}
    Start-Sleep -Milliseconds 250
  }while((Get-Date)-lt$deadline)
  throw ('GRMetro application files are still in use by: '+(($remaining|ForEach-Object{"$($_.Name) (PID $($_.ProcessId))"})-join', ')+'. Close GRMetro and retry.')
}

function Start-GrMetroInstalledApplication([string]$InstallRoot,[switch]$RuntimeOnly) {
  $root=[IO.Path]::GetFullPath($InstallRoot).TrimEnd('\')
  if($RuntimeOnly){
    $start=Join-Path $root 'scripts\windows\start-supervised-performance-center.ps1'
    if(-not(Test-Path -LiteralPath $start -PathType Leaf)){throw 'The installed GRMetro supervisor launcher is missing.'}
    Start-Process powershell.exe -ArgumentList @('-NoProfile','-ExecutionPolicy','Bypass','-WindowStyle','Hidden','-File',('"{0}"'-f$start),'-SkipBuild') -WorkingDirectory $root -WindowStyle Hidden|Out-Null
    return
  }
  $exe=Join-Path $root 'GRMetro Performance Center.exe'
  if(-not(Test-Path -LiteralPath $exe -PathType Leaf)){throw 'The installed GRMetro Control Center is missing.'}
  Start-Process -FilePath $exe -WorkingDirectory $root|Out-Null
}

function Restart-GrMetroAfterFailedUpgrade([string]$InstallRoot,$State) {
  if(-not$State){return}
  if($State.OperatorWasRunning){Start-GrMetroInstalledApplication $InstallRoot;return}
  if($State.RuntimeWasRunning){Start-GrMetroInstalledApplication $InstallRoot -RuntimeOnly}
}
