$ErrorActionPreference='Stop'
$repository=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
. (Join-Path $repository 'scripts\windows\package-files.ps1')
. (Join-Path $repository 'scripts\windows\release-identity.ps1')
. (Join-Path $repository 'scripts\windows\servicetitan-profile.ps1')
. (Join-Path $repository 'scripts\windows\manual-legacy-upgrade.ps1')
. (Join-Path $repository 'scripts\windows\legacy-composite-upgrade.ps1')

function Assert($condition,[string]$message){if(-not$condition){throw $message}}
function Expect-Failure([scriptblock]$action,[string]$pattern,[string]$message){$failure=$null;try{&$action}catch{$failure=$_.Exception.Message};Assert ($failure-and$failure-match$pattern) "$message Actual: $failure"}
function Write-Text([string]$path,[string]$value){New-Item -ItemType Directory -Force -Path ([IO.Path]::GetDirectoryName($path))|Out-Null;[IO.File]::WriteAllText($path,$value,(New-Object Text.UTF8Encoding $false))}
function Write-Json([string]$path,$value){Write-Text $path (($value|ConvertTo-Json -Depth 8)+[Environment]::NewLine)}

$fixture=Join-Path ([IO.Path]::GetTempPath()) ('grmetro manual legacy '+[guid]::NewGuid().ToString('N'))
$env:GRMETRO_UPDATER_TEST_MODE='true'
$evidenceJunction=$null
try{
  $legacyProfile=Join-Path $fixture 'profiles/legacy'
  $modernProfile=Join-Path $fixture 'profiles/modern'
  New-Item -ItemType Directory -Force -Path $legacyProfile,$modernProfile|Out-Null
  Write-Text (Join-Path $legacyProfile 'Preferences') 'AUTHENTICATED LEGACY PROFILE SENTINEL'
  $legacyProfileHash=(Get-FileHash (Join-Path $legacyProfile 'Preferences') -Algorithm SHA256).Hash
  Assert ((Resolve-GrMetroServiceTitanProfilePath -LegacyProfilePath $legacyProfile -LocalAppDataProfilePath $modernProfile)-eq[IO.Path]::GetFullPath($legacyProfile)) 'Established legacy profile was not preserved.'
  Assert ((Resolve-GrMetroServiceTitanProfilePath -ExplicitPath $modernProfile -LegacyProfilePath $legacyProfile -LocalAppDataProfilePath $modernProfile)-eq[IO.Path]::GetFullPath($modernProfile)) 'Explicit profile override did not win.'
  Assert (Test-GrMetroEdgeCommandLineUsesProfile "msedge.exe --user-data-dir=`"$legacyProfile`" --remote-debugging-port=9223" $legacyProfile) 'Quoted Edge profile command line was not recognized.'
  Assert (-not(Test-GrMetroEdgeCommandLineUsesProfile "msedge.exe --user-data-dir=`"${legacyProfile}-other`"" $legacyProfile)) 'Similar Edge profile path was matched broadly.'
  Write-Text (Join-Path $modernProfile 'Preferences') 'MODERN PROFILE SENTINEL'
  Expect-Failure {Resolve-GrMetroServiceTitanProfilePath -LegacyProfilePath $legacyProfile -LocalAppDataProfilePath $modernProfile} 'Both the legacy and LocalAppData' 'Ambiguous established profiles were not rejected.'
  Remove-Item -LiteralPath (Join-Path $legacyProfile 'Preferences') -Force
  Assert ((Resolve-GrMetroServiceTitanProfilePath -LegacyProfilePath $legacyProfile -LocalAppDataProfilePath $modernProfile)-eq[IO.Path]::GetFullPath($modernProfile)) 'Established LocalAppData profile was not selected.'
  Remove-Item -LiteralPath (Join-Path $modernProfile 'Preferences') -Force
  Assert ((Resolve-GrMetroServiceTitanProfilePath -LegacyProfilePath $legacyProfile -LocalAppDataProfilePath $modernProfile)-eq[IO.Path]::GetFullPath($modernProfile)) 'Fresh installation did not default to LocalAppData.'
  Write-Text (Join-Path $legacyProfile 'Preferences') 'AUTHENTICATED LEGACY PROFILE SENTINEL'

  $tokens=$null;$parseErrors=$null;$wizardAst=[Management.Automation.Language.Parser]::ParseFile((Join-Path $repository 'scripts/windows/env-wizard.ps1'),[ref]$tokens,[ref]$parseErrors)
  Assert ($parseErrors.Count-eq0) 'Environment wizard does not parse.'
  $converter=$wizardAst.Find({param($node)$node-is[Management.Automation.Language.FunctionDefinitionAst]-and$node.Name-eq'Convert-TechnicianConfigurationJson'},$true)
  Assert ($null-ne$converter) 'Environment wizard configuration converter is missing.';Invoke-Expression $converter.Extent.Text
  $wizardSynthetic=@([pscustomobject]@{id=300001;name='Wizard Alpha'},[pscustomobject]@{id=300002;name='Wizard Beta'})
  $wizardArray=ConvertTo-Json -InputObject @($wizardSynthetic) -Compress -Depth 5
  $wizardLegacy=([ordered]@{value=$wizardSynthetic;Count=$wizardSynthetic.Count}|ConvertTo-Json -Compress -Depth 5)
  foreach($input in @($wizardArray,$wizardLegacy)){$normalized=Convert-TechnicianConfigurationJson $input;$parsed=$normalized|ConvertFrom-Json;Assert ($parsed-is[array]-and@($parsed).Count-eq2-and$parsed[0].id-eq300001-and$parsed[1].id-eq300002) 'Environment wizard did not preserve canonical technician order.'}
  Write-Output 'PASS: Windows PowerShell 5.1 wizard emits a canonical technician array from current and legacy input.'

  $targetFiles=@(
    'package.json','.env.example','apps/backend/src/index.js','apps/dashboard/dist/index.html','GRMetro Performance Center.exe',
    'scripts/windows/package-manifest.json','scripts/windows/package-build.json','scripts/windows/package-files.ps1','scripts/windows/process-control.ps1',
    'scripts/windows/launch-integration.ps1','scripts/windows/release-identity.ps1','scripts/windows/application-validation.ps1','scripts/windows/env-wizard.ps1',
    'scripts/windows/runtime-versions.json','scripts/windows/runtime-paths.ps1','scripts/windows/servicetitan-profile.ps1','scripts/windows/manual-legacy-upgrade.ps1','scripts/windows/update-host-installation.ps1',
    'scripts/validate-private-configuration.js','shared/technicianConfiguration.js',
    'runtime/node/node.exe','runtime/node/LICENSE','runtime/node/VERSION','node_modules/express/package.json','node_modules/playwright/package.json','node_modules/qrcode-terminal/package.json'
  )|Sort-Object -Unique
  function New-TargetPackage([string]$name,[switch]$OmitProfileHelper,[string]$SourceState='committed'){
    $source=Join-Path $fixture ($name+' source');$zip=Join-Path $fixture ($name+'.zip')
    $files=@($targetFiles|Where-Object{-not($OmitProfileHelper-and$_-eq'scripts/windows/servicetitan-profile.ps1')})
    foreach($relative in $files){
      if($relative-in@('scripts/validate-private-configuration.js','shared/technicianConfiguration.js')){$destination=Join-Path $source $relative;New-Item -ItemType Directory -Force -Path ([IO.Path]::GetDirectoryName($destination))|Out-Null;Copy-Item -LiteralPath (Join-Path $repository $relative) -Destination $destination -Force}
      elseif($relative-notin@('scripts/windows/package-manifest.json','scripts/windows/package-build.json')){Write-Text (Join-Path $source $relative) ('NEW '+$relative)}
    }
    Write-Json (Join-Path $source 'scripts/windows/package-manifest.json') ([ordered]@{version=2;files=$files})
    Write-Json (Join-Path $source 'scripts/windows/package-build.json') (New-GrMetroReleaseMetadata -ReleaseVersion '2026.10.13.1' -Channel testing -Commit 'feed123' -SourceState $SourceState -BuiltAt '2026-10-13T12:00:00Z' -UpdaterProtocol 1 -NodeVersion 'v24.18.1')
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    [IO.Compression.ZipFile]::CreateFromDirectory($source,$zip)
    return $zip
  }
  $packageZip=New-TargetPackage 'target'
  $packageHash=(Get-FileHash $packageZip -Algorithm SHA256).Hash
  $invalidPackage=New-TargetPackage 'invalid' -OmitProfileHelper
  $dirtyPackage=New-TargetPackage 'dirty target' -SourceState 'working-tree'

  $oldFiles=@('package.json','apps/backend/src/index.js','GRMetro Performance Center.exe','scripts/windows/package-manifest.json','scripts/windows/package-build.json','scripts/windows/obsolete-tool.ps1')|Sort-Object
  $privateFiles=@('.env','data/company-config.json','data/goals.json','data/display-settings.json','data/management-dismissals.json','apps/backend/data/spreadsheet-slide.json','logs/supervisor.log','.grmetro-autostart-choice')
  function Install-LegacyBaseline([string]$name){
    $root=Join-Path $fixture ($name+'/Performance Center')
    foreach($relative in $oldFiles){if($relative-notin@('scripts/windows/package-manifest.json','scripts/windows/package-build.json')){Write-Text (Join-Path $root $relative) ('OLD '+$relative)}}
    Write-Json (Join-Path $root 'scripts/windows/package-manifest.json') ([ordered]@{version=2;files=$oldFiles})
    Write-Json (Join-Path $root 'scripts/windows/package-build.json') ([ordered]@{version=1;applicationVersion='1.0.0';commit='55f42c0';sourceState='working-tree';nodeVersion='v24.18.1';builtAt='2026-09-25T21:10:36Z'})
    foreach($relative in $privateFiles){Write-Text (Join-Path $root $relative) ('PRIVATE '+$relative)}
    return $root
  }
  $shortcuts=Join-Path $fixture 'shortcuts';Write-Text (Join-Path $shortcuts 'Desktop.lnk') 'DIRECT LAUNCHER SHORTCUT';Write-Text (Join-Path $shortcuts 'StartMenu.lnk') 'DIRECT LAUNCHER SHORTCUT'
  $shortcutHash=(Get-FileHash (Join-Path $shortcuts 'Desktop.lnk') -Algorithm SHA256).Hash
  $windowsIntegration=Join-Path $fixture 'windows integration';Write-Text (Join-Path $windowsIntegration 'autostart-task.xml') 'AUTOSTART DISABLED';Write-Text (Join-Path $windowsIntegration 'firewall-rule.txt') 'EXISTING FIREWALL STATE'
  $integrationHashes=@((Get-FileHash (Join-Path $windowsIntegration 'autostart-task.xml') -Algorithm SHA256).Hash,(Get-FileHash (Join-Path $windowsIntegration 'firewall-rule.txt') -Algorithm SHA256).Hash)
  $configAction={param($package,$install)[pscustomobject]@{Compatible=$true;TechnicianCount=2;EnvironmentUnchanged=$true;ServiceTitanContacted=$false}}

  # Exercise the real target parser against synthetic installed .env files using
  # only the installed Node runtime and dotenv module. No ServiceTitan process or
  # endpoint is involved, and the environment file must remain byte-identical.
  $configPackageSource=Join-Path $fixture 'config preflight package';$configPackage=Join-Path $fixture 'config preflight.zip'
  foreach($relative in @('scripts/validate-private-configuration.js','shared/technicianConfiguration.js')){$destination=Join-Path $configPackageSource $relative;New-Item -ItemType Directory -Force -Path ([IO.Path]::GetDirectoryName($destination))|Out-Null;Copy-Item -LiteralPath (Join-Path $repository $relative) -Destination $destination}
  Add-Type -AssemblyName System.IO.Compression.FileSystem
  [IO.Compression.ZipFile]::CreateFromDirectory($configPackageSource,$configPackage)
  $configInstall=Join-Path $fixture 'config preflight install';$nodeSource=(Get-Command node.exe -ErrorAction Stop).Source
  New-Item -ItemType Directory -Force -Path (Join-Path $configInstall 'node_modules')|Out-Null;Copy-Item -LiteralPath (Join-Path $repository 'node_modules/dotenv') -Destination (Join-Path $configInstall 'node_modules/dotenv') -Recurse
  $synthetic=@([ordered]@{id=200001;name='Synthetic Alpha';shortName='Alpha';initials='SA'},[ordered]@{id=200002;name='Synthetic Beta';shortName='Beta';initials='SB'})
  $legacyJson=[ordered]@{value=$synthetic;Count=$synthetic.Count}|ConvertTo-Json -Compress -Depth 6
  $environmentPath=Join-Path $configInstall '.env';Write-Text $environmentPath "SERVICETITAN_TECHNICIANS_JSON=$legacyJson`r`n"
  $environmentHash=(Get-FileHash $environmentPath -Algorithm SHA256).Hash
  $legacyPreflight=Test-GrMetroPrivateConfigurationCompatibility -PackageZip $configPackage -InstallRoot $configInstall -NodePath $nodeSource
  Assert ($legacyPreflight.Compatible-and$legacyPreflight.TechnicianCount-eq2-and-not$legacyPreflight.ServiceTitanContacted) 'Legacy private-configuration preflight failed.'
  Assert ((Get-FileHash $environmentPath -Algorithm SHA256).Hash-eq$environmentHash) 'Legacy preflight changed .env.'
  $arrayJson=ConvertTo-Json -InputObject @($synthetic) -Compress -Depth 6;Write-Text $environmentPath "SERVICETITAN_TECHNICIANS_JSON=$arrayJson`r`n";$environmentHash=(Get-FileHash $environmentPath -Algorithm SHA256).Hash
  $arrayPreflight=Test-GrMetroPrivateConfigurationCompatibility -PackageZip $configPackage -InstallRoot $configInstall -NodePath $nodeSource
  Assert ($arrayPreflight.Compatible-and$arrayPreflight.TechnicianCount-eq2) 'Array private-configuration preflight failed.'
  Assert ((Get-FileHash $environmentPath -Algorithm SHA256).Hash-eq$environmentHash) 'Array preflight changed .env.'
  $privateMarker='NEVER-LEAK-PRIVATE-EMPLOYEE';Write-Text $environmentPath ('SERVICETITAN_TECHNICIANS_JSON='+(@{unexpected=$privateMarker}|ConvertTo-Json -Compress)+"`r`n")
  $failureMessage=$null;try{$null=Test-GrMetroPrivateConfigurationCompatibility -PackageZip $configPackage -InstallRoot $configInstall -NodePath $nodeSource}catch{$failureMessage=$_.Exception.Message}
  Assert ($failureMessage-match'incompatible'-and$failureMessage-notmatch$privateMarker) 'Private-configuration preflight leaked a private value or accepted an ambiguous object.'
  Write-Output 'PASS: read-only target-package preflight accepts array and PowerShell 5.1 wrapper configurations and rejects ambiguous private input safely.'

  $validateRoot=Install-LegacyBaseline 'validate only'
  $validated=Invoke-GrMetroManualLegacyUpgrade -Root $validateRoot -Zip $packageZip -ExpectedHash $packageHash -ExpectedVersion '2026.10.13.1' -ExpectedCommit '55f42c0' -ValidateOnly -AllowTestRoot -PrivateConfigurationAction $configAction
  Assert ($validated.InstalledCommit-eq'55f42c0'-and$validated.Target.releaseVersion-eq'2026.10.13.1') 'Legacy validate-only result was incorrect.'
  Assert (-not(Test-Path (Get-GrMetroUpgradeRoot $validateRoot))) 'Validate-only created a transaction.'
  Expect-Failure {Invoke-GrMetroManualLegacyUpgrade -Root $validateRoot -Zip $packageZip -ExpectedHash $packageHash -ExpectedVersion '2026.10.13.1' -ExpectedCommit '55f42c0' -AllowTestRoot -PrivateConfigurationAction $configAction } 'Defender review' 'Application mutation did not require Defender-review confirmation.'
  Assert (-not(Test-Path (Get-GrMetroUpgradeRoot $validateRoot))) 'Missing confirmation created a transaction.'
  Expect-Failure {Invoke-GrMetroManualLegacyUpgrade -Root $validateRoot -Zip $packageZip -ExpectedHash ('0'*64) -ExpectedVersion '2026.10.13.1' -ExpectedCommit '55f42c0' -ValidateOnly -AllowTestRoot -PrivateConfigurationAction $configAction } 'SHA-256' 'Incorrect package hash was accepted.'
  Expect-Failure {Invoke-GrMetroManualLegacyUpgrade -Root $validateRoot -Zip $invalidPackage -ExpectedHash (Get-FileHash $invalidPackage -Algorithm SHA256).Hash -ExpectedVersion '2026.10.13.1' -ExpectedCommit '55f42c0' -ValidateOnly -AllowTestRoot -PrivateConfigurationAction $configAction } 'Required package file missing' 'Incomplete target manifest was accepted.'
  Expect-Failure {Invoke-GrMetroManualLegacyUpgrade -Root $validateRoot -Zip $dirtyPackage -ExpectedHash (Get-FileHash $dirtyPackage -Algorithm SHA256).Hash -ExpectedVersion '2026.10.13.1' -ExpectedCommit '55f42c0' -ValidateOnly -AllowTestRoot -PrivateConfigurationAction $configAction } 'committed source snapshot' 'Working-tree target identity was accepted.'
  $missingInstalledRoot=Install-LegacyBaseline 'missing installed inventory';Remove-Item -LiteralPath (Join-Path $missingInstalledRoot 'scripts/windows/obsolete-tool.ps1') -Force
  Expect-Failure {Invoke-GrMetroManualLegacyUpgrade -Root $missingInstalledRoot -Zip $packageZip -ExpectedHash $packageHash -ExpectedVersion '2026.10.13.1' -ExpectedCommit '55f42c0' -ValidateOnly -AllowTestRoot -PrivateConfigurationAction $configAction } 'historical manifest file is missing' 'Incomplete installed inventory was accepted.'
  $modernInstalledRoot=Install-LegacyBaseline 'modern installed identity';Write-Json (Join-Path $modernInstalledRoot 'scripts/windows/package-build.json') (New-GrMetroReleaseMetadata -ReleaseVersion '2026.10.12.1' -Channel testing -Commit 'abcdef1' -SourceState committed -UpdaterProtocol 1)
  Expect-Failure {Invoke-GrMetroManualLegacyUpgrade -Root $modernInstalledRoot -Zip $packageZip -ExpectedHash $packageHash -ExpectedVersion '2026.10.13.1' -ExpectedCommit '55f42c0' -ValidateOnly -AllowTestRoot -PrivateConfigurationAction $configAction } 'normal Update Host' 'Modern installed identity was accepted by the legacy wrapper.'
  $evidenceReparseRoot=Install-LegacyBaseline 'evidence reparse';$evidenceOutside=Join-Path $fixture 'evidence outside';New-Item -ItemType Directory -Force -Path $evidenceOutside|Out-Null;Write-Text (Join-Path $evidenceOutside 'sentinel.txt') 'OUTSIDE'
  $evidenceJunction=Join-Path ([IO.Path]::GetDirectoryName($evidenceReparseRoot)) 'Manual Upgrade Evidence';$null=New-Item -ItemType Junction -Path $evidenceJunction -Target $evidenceOutside
  Expect-Failure {Invoke-GrMetroManualLegacyUpgrade -Root $evidenceReparseRoot -Zip $packageZip -ExpectedHash $packageHash -ExpectedVersion '2026.10.13.1' -ExpectedCommit '55f42c0' -ConfirmDefenderReview -ConfirmRollbackSource -AllowTestRoot -PrivateConfigurationAction $configAction } 'evidence path is a reparse point' 'Evidence output followed a reparse point.'
  Assert ((Get-Content (Join-Path $evidenceOutside 'sentinel.txt')-Raw)-eq'OUTSIDE') 'Evidence reparse rejection changed the outside target.'
  Assert (-not(Test-Path (Get-GrMetroUpgradeRoot $evidenceReparseRoot))) 'Evidence reparse rejection created a transaction.'

  # Prove the wrapper can run from a copied deployment folder whose helper
  # imports resolve locally, without loading any script from the repository.
  $standalone=Join-Path $fixture 'standalone deployment/scripts/windows';New-Item -ItemType Directory -Force -Path $standalone|Out-Null
  foreach($name in @('manual-legacy-upgrade.ps1','package-files.ps1','process-control.ps1','application-validation.ps1','release-identity.ps1')){Copy-Item -LiteralPath (Join-Path $repository ('scripts/windows/'+$name)) -Destination (Join-Path $standalone $name)}
  $standaloneInvoker=Join-Path $fixture 'standalone deployment/validate.ps1'
  Write-Text $standaloneInvoker ('$ErrorActionPreference=''Stop''; $env:GRMETRO_UPDATER_TEST_MODE=''true''; . (Join-Path $PSScriptRoot ''scripts\windows\manual-legacy-upgrade.ps1''); $configAction={param($package,$install)[pscustomobject]@{Compatible=$true;TechnicianCount=2;EnvironmentUnchanged=$true;ServiceTitanContacted=$false}}; $result=Invoke-GrMetroManualLegacyUpgrade -Root $args[0] -Zip $args[1] -ExpectedHash $args[2] -ExpectedVersion ''2026.10.13.1'' -ExpectedCommit ''55f42c0'' -ValidateOnly -AllowTestRoot -PrivateConfigurationAction $configAction; if($result.InstalledCommit-ne''55f42c0''){throw ''Standalone validation returned the wrong identity.''}; ''STANDALONE PASS''')
  $standaloneOutput=& powershell.exe -NoProfile -File $standaloneInvoker $validateRoot $packageZip $packageHash 2>&1
  Assert ($LASTEXITCODE-eq0-and($standaloneOutput|Out-String)-match'STANDALONE PASS') "Standalone deployment wrapper validation failed: $($standaloneOutput|Out-String)"

  $successRoot=Install-LegacyBaseline 'success'
  $script:selectedProfile=$null
  $result=Invoke-GrMetroManualLegacyUpgrade -Root $successRoot -Zip $packageZip -ExpectedHash $packageHash -ExpectedVersion '2026.10.13.1' -ExpectedCommit '55f42c0' -ConfirmDefenderReview -ConfirmRollbackSource -AllowTestRoot -PrivateConfigurationAction $configAction  -StopProcessesAction {param($root);$journal=Get-Content (Join-Path (Get-GrMetroUpgradeRoot $root) 'journal.json') -Raw|ConvertFrom-Json;Assert ($journal.status-eq'prepared') 'Processes would have stopped before rollback preparation completed.';foreach($relative in $oldFiles){Assert (Test-Path (Get-GrMetroPackageDestination (Join-Path (Get-GrMetroUpgradeRoot $root) 'backup') $relative)-PathType Leaf) "Rollback backup was incomplete before process shutdown: $relative"};[pscustomobject]@{OperatorWasRunning=$false;RuntimeWasRunning=$false}} -ValidationAction {param($root,$version);$journal=Get-Content (Join-Path (Get-GrMetroUpgradeRoot $root) 'journal.json') -Raw|ConvertFrom-Json;Assert ($journal.status-eq'applied') 'Application validation did not run before transaction commit.';Assert ((Get-Content (Join-Path $root 'apps/backend/src/index.js') -Raw)-eq'NEW apps/backend/src/index.js') 'Validation did not see new application files.';[pscustomobject]@{BackendHealthy=$true}} -StartAction {param($root);Assert (-not(Test-Path (Get-GrMetroUpgradeRoot $root))) 'Control Center restart began before transaction commit.';$script:selectedProfile=Resolve-GrMetroServiceTitanProfilePath -LegacyProfilePath $legacyProfile -LocalAppDataProfilePath $modernProfile}
  Assert ($result.Status-eq'complete'-and$result.ReleaseVersion-eq'2026.10.13.1') 'Successful manual upgrade did not complete.'
  Assert ($script:selectedProfile-eq[IO.Path]::GetFullPath($legacyProfile)) 'Application restart did not retain the legacy ServiceTitan profile.'
  Assert (-not(Test-Path (Join-Path $successRoot 'scripts/windows/obsolete-tool.ps1'))) 'Obsolete legacy application file survived.'
  foreach($relative in $privateFiles){Assert ((Get-Content (Join-Path $successRoot $relative)-Raw)-eq('PRIVATE '+$relative)) "Successful upgrade changed private file: $relative"}
  Assert (-not(Test-Path (Get-GrMetroUpgradeRoot $successRoot))) 'Successful upgrade left a transaction.'
  Assert (-not(Test-Path (Join-Path ([IO.Path]::GetDirectoryName($successRoot)) 'Update Host'))) 'Manual upgrade installed an external Update Host.'
  Assert ((Get-FileHash (Join-Path $shortcuts 'Desktop.lnk') -Algorithm SHA256).Hash-eq$shortcutHash) 'Manual upgrade changed direct shortcuts.'
  Assert ((Get-FileHash (Join-Path $windowsIntegration 'autostart-task.xml') -Algorithm SHA256).Hash-eq$integrationHashes[0]) 'Manual upgrade changed autostart state.'
  Assert ((Get-FileHash (Join-Path $windowsIntegration 'firewall-rule.txt') -Algorithm SHA256).Hash-eq$integrationHashes[1]) 'Manual upgrade changed firewall state.'
  Assert ((Get-FileHash (Join-Path $legacyProfile 'Preferences') -Algorithm SHA256).Hash-eq$legacyProfileHash) 'Manual upgrade changed legacy browser profile data.'

  $failureRoot=Install-LegacyBaseline 'validation failure'
  Expect-Failure {Invoke-GrMetroManualLegacyUpgrade -Root $failureRoot -Zip $packageZip -ExpectedHash $packageHash -ExpectedVersion '2026.10.13.1' -ExpectedCommit '55f42c0' -ConfirmDefenderReview -ConfirmRollbackSource -AllowTestRoot -PrivateConfigurationAction $configAction  -StopProcessesAction {param($root)[pscustomobject]@{OperatorWasRunning=$false;RuntimeWasRunning=$false}} -ValidationAction {throw 'Injected application validation failure.'} -StartAction {}} 'previous application was restored' 'Validation failure did not report rollback.'
  Assert ((Get-Content (Join-Path $failureRoot 'apps/backend/src/index.js')-Raw)-eq'OLD apps/backend/src/index.js') 'Validation rollback did not restore old application.'
  Assert (Test-Path (Join-Path $failureRoot 'scripts/windows/obsolete-tool.ps1')) 'Validation rollback did not restore obsolete old application file.'
  foreach($relative in $privateFiles){Assert ((Get-Content (Join-Path $failureRoot $relative)-Raw)-eq('PRIVATE '+$relative)) "Rollback changed private file: $relative"}
  Assert (-not(Test-Path (Get-GrMetroUpgradeRoot $failureRoot))) 'Successful rollback left a transaction.'
  Assert (@(Get-ChildItem -LiteralPath (Join-Path ([IO.Path]::GetDirectoryName($failureRoot)) 'Manual Upgrade Evidence') -Filter '*.json' -File).Count -gt 0) 'Failure evidence was not preserved.'

  $stopFailureRoot=Install-LegacyBaseline 'partial stop failure';$script:restartAfterStopFailure=$false
  Expect-Failure {Invoke-GrMetroManualLegacyUpgrade -Root $stopFailureRoot -Zip $packageZip -ExpectedHash $packageHash -ExpectedVersion '2026.10.13.1' -ExpectedCommit '55f42c0' -ConfirmDefenderReview -ConfirmRollbackSource -AllowTestRoot -PrivateConfigurationAction $configAction  -CaptureProcessStateAction {param($root)[pscustomobject]@{OperatorWasRunning=$true;RuntimeWasRunning=$false}} -StopProcessesAction {throw 'Injected partial process-stop failure.'} -ValidationAction {} -StartAction {} -RestartAfterFailureAction {param($root,$state);Assert $state.OperatorWasRunning 'Prior process state was not captured before stopping.';$script:restartAfterStopFailure=$true}} 'installed application was unchanged' 'Partial process-stop failure did not preserve the prepared application state.'
  Assert $script:restartAfterStopFailure 'Partial process-stop failure did not restore prior process state.'
  Assert ((Get-Content (Join-Path $stopFailureRoot 'apps/backend/src/index.js')-Raw)-eq'OLD apps/backend/src/index.js') 'Partial process-stop failure changed the application.'

  $cleanupFailureRoot=Install-LegacyBaseline 'committed cleanup failure';$script:startAfterCleanupFailure=$false
  Expect-Failure {Invoke-GrMetroManualLegacyUpgrade -Root $cleanupFailureRoot -Zip $packageZip -ExpectedHash $packageHash -ExpectedVersion '2026.10.13.1' -ExpectedCommit '55f42c0' -ConfirmDefenderReview -ConfirmRollbackSource -AllowTestRoot -PrivateConfigurationAction $configAction  -CaptureProcessStateAction {param($root)[pscustomobject]@{OperatorWasRunning=$false;RuntimeWasRunning=$false}} -StopProcessesAction {} -ValidationAction {param($root,$version)[pscustomobject]@{BackendHealthy=$true}} -CompleteAction {param($root);$journalPath=Join-Path (Get-GrMetroUpgradeRoot $root) 'journal.json';$journal=Get-Content $journalPath -Raw|ConvertFrom-Json;$journal.status='completed';Write-GrMetroUpgradeJournal $journalPath $journal;throw 'Injected committed cleanup failure.'} -StartAction {$script:startAfterCleanupFailure=$true} -RestartAfterFailureAction {throw 'Committed cleanup failure must not restart or roll back automatically.'}} 'committed transaction cleanup did not finish' 'Committed cleanup failure was misclassified as rollback.'
  Assert (-not$script:startAfterCleanupFailure) 'Control Center started with an unresolved committed transaction.'
  Assert ((Get-Content (Join-Path $cleanupFailureRoot 'apps/backend/src/index.js')-Raw)-eq'NEW apps/backend/src/index.js') 'Committed cleanup failure incorrectly rolled back the validated application.'
  Assert (Test-Path (Get-GrMetroUpgradeRoot $cleanupFailureRoot)) 'Committed cleanup evidence was discarded.'

  $interruptedRoot=Install-LegacyBaseline 'interrupted'
  $null=Prepare-GrMetroPackageTransaction $packageZip $interruptedRoot
  Expect-Failure {Invoke-GrMetroManualLegacyUpgrade -Root $interruptedRoot -Zip $packageZip -ExpectedHash $packageHash -ExpectedVersion '2026.10.13.1' -ExpectedCommit '55f42c0' -ValidateOnly -AllowTestRoot -PrivateConfigurationAction $configAction } 'pending transaction' 'Existing transaction was not rejected.'
  Expect-Failure {Prepare-GrMetroPackageTransaction $packageZip $interruptedRoot -RejectExistingTransaction} 'pending GRMetro transaction' 'Preparation recovered or replaced a transaction despite strict rejection.'
  Assert (Test-Path (Get-GrMetroUpgradeRoot $interruptedRoot)) 'Rejected interrupted transaction evidence was removed.'

  $hostBundle=Join-Path $fixture 'synthetic host bundle.zip';Write-Text $hostBundle 'SYNTHETIC HOST BUNDLE';$hostHash=(Get-FileHash $hostBundle -Algorithm SHA256).Hash
  $hostPreflight={param($application,$version,$bundle,$hash)[pscustomobject]@{Status='validated';AuthenticodeStatus='NotSigned';UpdateDiscoveryStatus='up-to-date'}}
  function New-CompositeManualAction([switch]$FailValidation){
    $validation=if($FailValidation){{throw 'INJECTED COMPOSITE VALIDATION FAILURE'}}else{{param($root,$version,$validationPort)[pscustomobject]@{BackendHealthy=$true}}}
    return {param($application,$port) Invoke-GrMetroManualLegacyUpgrade -Root $application.InstallRoot -Zip $application.PackageZip -ExpectedHash $application.PackageSha256 -ExpectedVersion '2026.10.13.1' -ExpectedCommit '55f42c0' -ConfirmDefenderReview -ConfirmRollbackSource -DeferCommitCleanup -AllowTestRoot -Port $port -PrivateConfigurationAction $configAction -CaptureProcessStateAction {param($root)[pscustomobject]@{OperatorWasRunning=$true;RuntimeWasRunning=$true}} -StopProcessesAction {} -ValidationAction $validation}.GetNewClosure()
  }
  $compositeRoot=Install-LegacyBaseline 'composite success';Write-Text (Join-Path $compositeRoot '.grmetro-autostart-choice') 'no';$script:hostCompleted=$false;$script:applicationStarted=$false;$script:launchEnabled=$true
  $composite=Invoke-GrMetroLegacyCompositeUpgrade -Root $compositeRoot -Zip $packageZip -ExpectedHash $packageHash -Version '2026.10.13.1' -LegacyCommit '55f42c0' -HostBundle $hostBundle -HostHash $hostHash -ConfirmDefender -ConfirmRollback -ConfirmUnsigned -AllowTestRoot -PrivateConfigurationAction $configAction -HostValidationAction $hostPreflight -InstallHostAction {param($bundle)[pscustomobject]@{ApplyOnSetup=$true;SourceChannel='testing';Backup='synthetic'}} -ManualUpgradeAction (New-CompositeManualAction) -SaveLaunchAction {param($root)[pscustomobject]@{Saved=$true}} -SetLaunchAction {param($root,$enabled)$script:launchEnabled=$enabled;[pscustomobject]@{HostExecutable='synthetic-host.exe'}} -CompleteHostAction {param($state)$script:hostCompleted=$true} -StartApplicationAction {param($root);Assert (-not(Test-Path (Get-GrMetroUpgradeRoot $root))) 'Composite started before application commit.';$script:applicationStarted=$true}
  Assert ($composite.Status-eq'complete'-and$script:hostCompleted-and$script:applicationStarted-and-not$script:launchEnabled) 'Composite success did not commit both components or preserve disabled autostart.'
  Assert ((Get-Content (Join-Path $compositeRoot 'apps/backend/src/index.js')-Raw)-eq'NEW apps/backend/src/index.js') 'Composite success did not retain the target application.';foreach($relative in @($privateFiles|Where-Object{$_-ne'.grmetro-autostart-choice'})){Assert ((Get-Content (Join-Path $compositeRoot $relative)-Raw)-eq('PRIVATE '+$relative)) "Composite success changed private file: $relative"};Assert ((Get-Content (Join-Path $compositeRoot '.grmetro-autostart-choice')-Raw)-eq'no') 'Composite success changed disabled autostart.'

  $compositeFailureRoot=Install-LegacyBaseline 'composite validation failure';Write-Text (Join-Path $compositeFailureRoot '.grmetro-autostart-choice') 'no';$script:hostRestored=$false
  Expect-Failure {Invoke-GrMetroLegacyCompositeUpgrade -Root $compositeFailureRoot -Zip $packageZip -ExpectedHash $packageHash -Version '2026.10.13.1' -LegacyCommit '55f42c0' -HostBundle $hostBundle -HostHash $hostHash -ConfirmDefender -ConfirmRollback -ConfirmUnsigned -AllowTestRoot -PrivateConfigurationAction $configAction -HostValidationAction $hostPreflight -InstallHostAction {param($bundle)[pscustomobject]@{ApplyOnSetup=$true;SourceChannel='testing';Backup='synthetic'}} -ManualUpgradeAction (New-CompositeManualAction -FailValidation) -RestoreHostAction {param($state)$script:hostRestored=$true}} 'prior application and Update Host state were restored|previous application was restored' 'Composite validation failure was not rolled back.'
  Assert ($script:hostRestored) 'Composite validation failure did not restore the host.';Assert ((Get-Content (Join-Path $compositeFailureRoot 'apps/backend/src/index.js')-Raw)-eq'OLD apps/backend/src/index.js') 'Composite validation failure did not restore the legacy application.';Assert (-not(Test-Path (Get-GrMetroUpgradeRoot $compositeFailureRoot))) 'Composite rollback left an application transaction.'

  $launchFailureRoot=Install-LegacyBaseline 'composite launch integration failure';Write-Text (Join-Path $launchFailureRoot '.grmetro-autostart-choice') 'no';$script:launchRestored=$false;$script:hostRestored=$false;$script:priorRestarted=$false
  Expect-Failure {Invoke-GrMetroLegacyCompositeUpgrade -Root $launchFailureRoot -Zip $packageZip -ExpectedHash $packageHash -Version '2026.10.13.1' -LegacyCommit '55f42c0' -HostBundle $hostBundle -HostHash $hostHash -ConfirmDefender -ConfirmRollback -ConfirmUnsigned -AllowTestRoot -PrivateConfigurationAction $configAction -HostValidationAction $hostPreflight -InstallHostAction {param($bundle)[pscustomobject]@{ApplyOnSetup=$true;SourceChannel='testing';Backup='synthetic'}} -ManualUpgradeAction (New-CompositeManualAction) -SaveLaunchAction {param($root)[pscustomobject]@{Saved=$true}} -SetLaunchAction {throw 'INJECTED LAUNCH INTEGRATION FAILURE'} -RestoreLaunchAction {param($state)$script:launchRestored=$true} -RestoreHostAction {param($state)$script:hostRestored=$true} -RestartPriorAction {param($root,$state)$script:priorRestarted=$state.OperatorWasRunning-and$state.RuntimeWasRunning}} 'prior application and Update Host state were restored' 'Composite launch failure was not rolled back.'
  Assert ($script:launchRestored-and$script:hostRestored-and$script:priorRestarted) 'Composite launch failure did not restore every prior state.';Assert ((Get-Content (Join-Path $launchFailureRoot 'apps/backend/src/index.js')-Raw)-eq'OLD apps/backend/src/index.js') 'Composite launch failure did not restore the legacy application.'
  Write-Output 'PASS: composite legacy upgrade commits application/host together and rolls back validation and launch-integration failures.'

  Write-Output 'PASS: legacy identity upgrade validates before mutation, preserves private state and shortcuts, rolls back failures, and rejects interrupted or malformed inputs.'
  Write-Output 'PASS: ServiceTitan profile selection preserves established legacy or modern profiles, honors explicit paths, and rejects ambiguity without touching profile data.'
}finally{
  $env:GRMETRO_UPDATER_TEST_MODE=$null
  if($evidenceJunction-and(Test-Path -LiteralPath $evidenceJunction)){[IO.Directory]::Delete($evidenceJunction,$false)}
  if(Test-Path -LiteralPath $fixture){$resolved=[IO.Path]::GetFullPath($fixture);$temp=[IO.Path]::GetFullPath([IO.Path]::GetTempPath()).TrimEnd('\');if([IO.Path]::GetDirectoryName($resolved)-ne$temp-or[IO.Path]::GetFileName($resolved)-notlike'grmetro manual legacy *'){throw 'Unsafe manual legacy fixture cleanup path.'};[IO.Directory]::Delete($resolved,$true)}
}
