param([string]$PackageZip,[string]$UpdateHostBundle)
$ErrorActionPreference="Stop"
Add-Type -AssemblyName System.Windows.Forms
$transactionPending=$false
$priorProcessState=$null
$updateHostState=$null
$launchIntegrationState=$null
. (Join-Path $PSScriptRoot 'update-host-installation.ps1')
try {
  $installRoot=Join-Path $env:LOCALAPPDATA "GRMetro\Performance Center"
  if(-not$PackageZip){$PackageZip=Join-Path $PSScriptRoot "grmetro-performance-center-package.zip"}
  if(-not(Test-Path $PackageZip)){throw "Installer package is missing: $PackageZip"}
  . (Join-Path $PSScriptRoot 'package-files.ps1')
  . (Join-Path $PSScriptRoot 'process-control.ps1')
  . (Join-Path $PSScriptRoot 'launch-integration.ps1')
  $recoveryAction=Get-GrMetroUpgradeRecoveryAction $installRoot
  if($recoveryAction -eq 'cleanup'){$null=Restore-GrMetroUpgradeTransaction $installRoot}
  $priorProcessState=Stop-GrMetroUpgradeProcesses $installRoot
  Install-GrMetroPackageFiles -PackageZip $PackageZip -InstallRoot $installRoot -DeferCommitCleanup
  $transactionPending=$true
  $wizard=Join-Path $installRoot "scripts\windows\env-wizard.ps1"
  $wizardResult=Invoke-GrMetroPowerShellScript -ScriptPath $wizard -WorkingDirectory $installRoot -Sta
  if($wizardResult.ExitCode -eq 2){Complete-GrMetroUpgradeTransaction $installRoot;$transactionPending=$false;[System.Windows.Forms.MessageBox]::Show("Setup was cancelled. You can run GRMetro Performance Center later to continue.","GRMetro Setup")|Out-Null;exit 0}
  if($wizardResult.ExitCode -ne 0){throw (Format-GrMetroScriptFailure $wizardResult 'Configuration wizard')}
  $setup=Join-Path $installRoot "scripts\windows\setup-performance-center.ps1"
  $setupResult=Invoke-GrMetroPowerShellScript -ScriptPath $setup -WorkingDirectory $installRoot -Arguments @('-SkipWizard')
  if($setupResult.ExitCode -ne 0){throw (Format-GrMetroScriptFailure $setupResult 'GRMetro setup validation')}
  $updateHostState=Install-GrMetroStableUpdateHost $UpdateHostBundle
  $exe=Join-Path $installRoot "GRMetro Performance Center.exe"
  if(-not(Test-Path -LiteralPath $exe -PathType Leaf)){throw "The packaged GRMetro launcher is missing. Run Setup again."}
  $firewallChoice=Join-Path $installRoot '.grmetro-firewall-choice'
  if((Test-Path -LiteralPath $firewallChoice)-and((Get-Content -LiteralPath $firewallChoice -Raw).Trim()-eq 'yes')){
    try{
      $firewallScript=Join-Path $installRoot 'scripts\windows\configure-private-firewall.ps1'
      $nodePath=Join-Path $installRoot 'runtime\node\node.exe'
      $firewallProcess=Start-Process -FilePath powershell.exe -Verb RunAs -Wait -PassThru -ArgumentList @('-NoProfile','-ExecutionPolicy','Bypass','-File',('"{0}"' -f $firewallScript),'-NodePath',('"{0}"' -f $nodePath))
      if($firewallProcess.ExitCode -ne 0){throw "Firewall configuration exited with code $($firewallProcess.ExitCode)."}
    }catch{
      [System.Windows.Forms.MessageBox]::Show("GRMetro was installed, but Windows Firewall access was not configured.`n`nPhones and TVs may be unable to connect until private-network access is allowed.`n`n$($_.Exception.Message)","GRMetro Firewall Setup",[System.Windows.Forms.MessageBoxButtons]::OK,[System.Windows.Forms.MessageBoxIcon]::Warning)|Out-Null
    }
  }
  $choice=Join-Path $installRoot ".grmetro-autostart-choice"
  $autostartEnabled=(Test-Path -LiteralPath $choice)-and((Get-Content -LiteralPath $choice -Raw).Trim()-eq'yes')
  $launchIntegrationState=Save-GrMetroLaunchIntegrationState $installRoot
  $launchPaths=Set-GrMetroLaunchIntegration $installRoot $autostartEnabled
  # Keep implementation files out of the normal day-to-day view without changing their paths.
  foreach($internal in @((Join-Path $installRoot "scripts"),(Join-Path $installRoot ".env"),(Join-Path $installRoot ".grmetro-autostart-choice"),(Join-Path $installRoot ".grmetro-firewall-choice"))){if(Test-Path $internal){try{(Get-Item $internal -Force).Attributes=(Get-Item $internal -Force).Attributes -bor [IO.FileAttributes]::Hidden}catch{}}}
  Complete-GrMetroUpgradeTransaction $installRoot
  $transactionPending=$false
  Complete-GrMetroStableUpdateHost $updateHostState
  $updateHostState=$null
  $launchIntegrationState=$null
  [System.Windows.Forms.MessageBox]::Show("GRMetro Performance Center is installed and ready. Use the Desktop or Start Menu shortcut from now on.","GRMetro Setup",[System.Windows.Forms.MessageBoxButtons]::OK,[System.Windows.Forms.MessageBoxIcon]::Information)|Out-Null
  Start-Process -FilePath $launchPaths.HostExecutable -ArgumentList @('-Mode','Launch') -WorkingDirectory $launchPaths.HostRoot
}catch{
  $installationFailure=$_
  $upgradeRoot=if($installRoot){[IO.Path]::GetFullPath($installRoot).TrimEnd('\')+'.upgrade-transaction'}else{$null}
  $rollbackMessage=if($upgradeRoot -and (Test-Path -LiteralPath $upgradeRoot)){'An incomplete application transaction remains beside the installation. Do not delete it; preserve it for recovery diagnostics before retrying Setup.'}else{'No pending application transaction remains; the prior application was unchanged or restored.'}
  if($transactionPending){
    try{$restored=Restore-GrMetroUpgradeTransaction $installRoot;$rollbackMessage=if($restored){'The previous application was restored; a clean first install was removed.'}else{'The pending application transaction was already clean.'};$transactionPending=$false}catch{$rollbackMessage="Automatic rollback failed: $($_.Exception.Message)"}
  }
  if($launchIntegrationState){try{Restore-GrMetroLaunchIntegration $launchIntegrationState;$launchIntegrationState=$null}catch{$rollbackMessage+=" Launch integration rollback failed: $($_.Exception.Message)"}}
  if($updateHostState){try{Restore-GrMetroStableUpdateHost $updateHostState;$updateHostState=$null}catch{$rollbackMessage+=" Update Host rollback failed: $($_.Exception.Message)"}}
  if(-not($upgradeRoot -and (Test-Path -LiteralPath $upgradeRoot))){try{Restart-GrMetroAfterFailedUpgrade $installRoot $priorProcessState}catch{$rollbackMessage+=" The prior GRMetro process could not be restarted: $($_.Exception.Message)"}}
  $message="GRMetro Performance Center could not be installed.`n`n$($installationFailure.Exception.Message)`n`n$rollbackMessage`n`nNo autostart task was created. Correct the problem, then run Setup again."
  [System.Windows.Forms.MessageBox]::Show($message,"GRMetro Setup Failed",[System.Windows.Forms.MessageBoxButtons]::OK,[System.Windows.Forms.MessageBoxIcon]::Error)|Out-Null
  exit 1
}
