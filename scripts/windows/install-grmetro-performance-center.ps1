param([string]$PackageZip,[string]$UpdateHostBundle)
$ErrorActionPreference="Stop"
Add-Type -AssemblyName System.Windows.Forms
$transactionPending=$false
$priorProcessState=$null
$updateHostState=$null
$launchIntegrationState=$null

function Install-GrMetroStableUpdateHost([string]$BundlePath) {
  if(-not$BundlePath){return}
  if(-not(Test-Path -LiteralPath $BundlePath -PathType Leaf)){throw 'The GRMetro Update Host bundle is missing.'}
  Add-Type -AssemblyName System.IO.Compression.FileSystem
  $parent=Join-Path $env:LOCALAPPDATA 'GRMetro';$destination=Join-Path $parent 'Update Host'
  $stage=Join-Path $parent ('Update Host.installing-'+[guid]::NewGuid().ToString('N'));$backup=Join-Path $parent 'Update Host.previous'
  New-Item -ItemType Directory -Force -Path $parent,$stage|Out-Null
  try{
    $archive=[IO.Compression.ZipFile]::OpenRead([IO.Path]::GetFullPath($BundlePath))
    try{
      $allowed=@('GRMetro Update Host.exe','update-host.ps1','package-files.ps1','process-control.ps1','application-validation.ps1','release-identity.ps1','release-feed.ps1','authenticode-signing.ps1','release-source.default.json','release-public-keys.json','provisioning-policy.json');$seen=@{}
      foreach($entry in $archive.Entries){
        $relative=$entry.FullName.Replace('\','/')
        if($relative -notin $allowed -or $seen.ContainsKey($relative)){throw "Unexpected Update Host entry: $relative"}
        $target=[IO.Path]::GetFullPath((Join-Path $stage $relative));if([IO.Path]::GetDirectoryName($target)-ne[IO.Path]::GetFullPath($stage).TrimEnd('\')){throw 'Update Host entry escaped its installation root.'}
        [IO.Compression.ZipFileExtensions]::ExtractToFile($entry,$target,$false);$seen[$relative]=$true
      }
      foreach($required in $allowed){if(-not$seen.ContainsKey($required)){throw "Update Host entry missing: $required"}}
    }finally{$archive.Dispose()}
    $policy=Get-Content -LiteralPath (Join-Path $stage 'provisioning-policy.json') -Raw|ConvertFrom-Json
    if([int]$policy.schemaVersion-ne1-or[int]$policy.updaterProtocol-lt1-or$policy.applyOnSetup-isnot[bool]){throw 'Update Host provisioning policy is invalid.'}
    . (Join-Path $stage 'release-feed.ps1')
    $source=Read-GrMetroReleaseSource (Join-Path $stage 'release-source.default.json')
    $keys=Get-GrMetroPinnedReleaseKeys (Join-Path $stage 'release-public-keys.json')
    if($policy.applyOnSetup-eq$true-and(-not$source.Enabled-or$keys.Count-lt1)){throw 'Production trust provisioning requires an enabled release source and at least one production public key.'}
    if($policy.applyOnSetup-eq$true){Assert-GrMetroProvisionedKeyFingerprints (Join-Path $stage 'release-public-keys.json')}
    if($policy.applyOnSetup-ne$true-and($source.Enabled-or$keys.Count-ne0)){throw 'Nonprovisioning Update Host bundles must retain disabled feed and empty key defaults.'}
    if(Test-Path -LiteralPath $backup){Remove-Item -LiteralPath $backup -Recurse -Force}
    if(Test-Path -LiteralPath $destination){Move-Item -LiteralPath $destination -Destination $backup}
    try{Move-Item -LiteralPath $stage -Destination $destination}catch{if((Test-Path -LiteralPath $backup) -and -not(Test-Path -LiteralPath $destination)){Move-Item -LiteralPath $backup -Destination $destination};throw}
    if($policy.applyOnSetup-ne$true-and(Test-Path -LiteralPath (Join-Path $backup 'release-public-keys.json') -PathType Leaf)){$null=Get-GrMetroPinnedReleaseKeys (Join-Path $backup 'release-public-keys.json');Copy-Item -LiteralPath (Join-Path $backup 'release-public-keys.json') -Destination (Join-Path $destination 'release-public-keys.json') -Force}
    $stateRoot=Join-Path $parent 'Update State';$sourceConfig=Join-Path $stateRoot 'release-source.json';$sourceExisted=Test-Path -LiteralPath $sourceConfig -PathType Leaf;$sourceBytes=if($sourceExisted){[IO.File]::ReadAllBytes($sourceConfig)}else{$null};$sourceChanged=$false
    if($policy.applyOnSetup-eq$true-or-not$sourceExisted){New-Item -ItemType Directory -Force -Path $stateRoot|Out-Null;Copy-Item -LiteralPath (Join-Path $destination 'release-source.default.json') -Destination $sourceConfig -Force;$sourceChanged=$true}
    return [pscustomobject]@{Destination=$destination;Backup=$backup;HadPrevious=[bool](Test-Path -LiteralPath $backup);StateRoot=$stateRoot;SourceConfig=$sourceConfig;SourceExisted=[bool]$sourceExisted;SourceBytes=$sourceBytes;SourceChanged=$sourceChanged}
  }finally{if(Test-Path -LiteralPath $stage){Remove-Item -LiteralPath $stage -Recurse -Force -ErrorAction SilentlyContinue}}
}

function Complete-GrMetroStableUpdateHost($State) {
  if($State -and (Test-Path -LiteralPath $State.Backup)){Remove-Item -LiteralPath $State.Backup -Recurse -Force}
}

function Restore-GrMetroStableUpdateHost($State) {
  if(-not$State){return}
  if(Test-Path -LiteralPath $State.Destination){Remove-Item -LiteralPath $State.Destination -Recurse -Force}
  if($State.HadPrevious){if(-not(Test-Path -LiteralPath $State.Backup)){throw 'Previous GRMetro Update Host backup is missing.'};Move-Item -LiteralPath $State.Backup -Destination $State.Destination}
  if($State.SourceChanged){if($State.SourceExisted){[IO.File]::WriteAllBytes($State.SourceConfig,[byte[]]$State.SourceBytes)}elseif(Test-Path -LiteralPath $State.SourceConfig){Remove-Item -LiteralPath $State.SourceConfig -Force;if((Test-Path -LiteralPath $State.StateRoot)-and@(Get-ChildItem -LiteralPath $State.StateRoot -Force).Count-eq0){Remove-Item -LiteralPath $State.StateRoot -Force}}}
}
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
