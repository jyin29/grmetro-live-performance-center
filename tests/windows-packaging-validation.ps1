$ErrorActionPreference = 'Stop'
$repository = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
. (Join-Path $repository 'scripts/windows/package-files.ps1')
function Assert($condition, [string]$message) { if (-not $condition) { throw $message } }
function Expect-Failure([scriptblock]$action, [string]$message) {
  $failed = $false
  try { & $action } catch { $failed = $true }
  Assert $failed $message
}
function Write-Fixture([string]$path, [string]$value) {
  New-Item -ItemType Directory -Force -Path ([IO.Path]::GetDirectoryName($path)) | Out-Null
  [IO.File]::WriteAllText($path, $value)
}

$fixture = Join-Path ([IO.Path]::GetTempPath()) ('grmetro validation ' + [guid]::NewGuid())
try {
  # No launcher/installer entry point is executed. Only pure packaging functions,
  # extracted UI markup, and harmless child scripts inside this fixture are exercised.
  $source = Join-Path $fixture 'source'
  $stage = Join-Path $fixture 'stage'
  $transactionSource = Join-Path $fixture 'transaction source'
  $transactionStage = Join-Path $fixture 'transaction stage'
  $installed = Join-Path $fixture 'installed/Performance Center'
  $zip = Join-Path $fixture 'package.zip'
  $manifestPath = 'scripts/windows/package-manifest.json'
  $manifestText = Get-Content -LiteralPath (Join-Path $repository $manifestPath) -Raw
  $manifest = $manifestText | ConvertFrom-Json
  $files = @(Get-GrMetroPackageFiles $manifest)
  $obsoletePath = 'scripts/windows/obsolete-tool.ps1'
  # Keep repeated transaction scenarios fast while retaining every required file.
  $transactionFiles = @('package.json','package-lock.json','.env.example','apps/backend/src/index.js','scripts/windows/package-manifest.json','scripts/windows/package-files.ps1','scripts/windows/process-control.ps1','scripts/windows/launch-integration.ps1','scripts/windows/release-identity.ps1','scripts/windows/application-validation.ps1','scripts/windows/env-wizard.ps1','GRMetro Performance Center.exe')
  $transactionManifest = [ordered]@{ version = 1; files = @($transactionFiles | Sort-Object -Unique) }
  $transactionManifestText = ($transactionManifest | ConvertTo-Json -Depth 3) + [Environment]::NewLine
  $oldManifest = [ordered]@{ version = 1; files = @($transactionFiles + $obsoletePath | Sort-Object -Unique) }
  $oldManifestText = ($oldManifest | ConvertTo-Json -Depth 3) + [Environment]::NewLine
  foreach ($relative in $files) { Write-Fixture (Join-Path $source $relative) ('application ' + $relative) }
  Write-Fixture (Join-Path $source $manifestPath) $manifestText
  $privatePaths = @('.env','.env.production','.grmetro-autostart-choice','.grmetro-firewall-choice','data/company-config.json','data/goals.json','data/goals.json.tmp','data/display-settings.json','data/management-dismissals.json','data/management-dismissals.json.tmp','apps/backend/data/goals.json','apps/backend/data/display-settings.json','apps/backend/data/management-dismissals.json','apps/backend/data/spreadsheet-slide.json','config/company.local.json','apps/backend/config/company.private.json','logs/supervisor.log','browser-profile/Cookies','~.DDF','node_modules/local.txt','apps/dashboard/dist/old.js','scripts/windows/local.ps1','apps/backend/src/local.private.json')
  foreach ($relative in $privatePaths) {
    Write-Fixture (Join-Path $source $relative) 'DO NOT PACKAGE'
    Write-Fixture (Join-Path $installed $relative) ('PRESERVE ' + $relative)
  }
  Write-Fixture (Join-Path $installed 'apps/backend/src/index.js') 'old application'
  Write-Fixture (Join-Path $installed $manifestPath) $oldManifestText
  Write-Fixture (Join-Path $installed $obsoletePath) 'obsolete application file'
  Copy-GrMetroPackageFiles $source $stage
  $staged = @(Get-ChildItem -LiteralPath $stage -Recurse -File -Force)
  Assert ($staged.Count -eq $files.Count) 'Stage must contain only manifest files.'
  foreach ($relative in $privatePaths) { Assert (-not (Test-Path -LiteralPath (Join-Path $stage $relative))) "Packaged local file: $relative" }
  foreach ($relative in $transactionFiles) { Write-Fixture (Join-Path $transactionSource $relative) ('application ' + $relative) }
  Write-Fixture (Join-Path $transactionSource $manifestPath) $transactionManifestText
  Copy-GrMetroPackageFiles $transactionSource $transactionStage
  Add-Type -AssemblyName System.IO.Compression.FileSystem
  [IO.Compression.ZipFile]::CreateFromDirectory($transactionStage, $zip)

  # Transaction cleanup tolerates only bounded ERROR_DIR_NOT_EMPTY races and
  # confirms root absence after every attempt.
  $cleanupInstall=Join-Path $fixture 'cleanup policy/Performance Center'
  $cleanupRoot=Get-GrMetroUpgradeRoot $cleanupInstall
  Write-Fixture (Join-Path $cleanupRoot 'first.txt') 'first'
  $script:cleanupAttempts=0
  Remove-GrMetroUpgradeRoot $cleanupInstall -RemovalAction {param($target,$attempt);$script:cleanupAttempts++;[IO.Directory]::Delete($target,$true);throw [IO.IOException]::new('The directory is not empty.')} -DelayAction {}
  Assert ($script:cleanupAttempts -eq 1 -and -not(Test-Path -LiteralPath $cleanupRoot)) 'Cleanup did not accept an absent root after transient Remove-Item error.'

  Write-Fixture (Join-Path $cleanupRoot 'retry.txt') 'retry'
  $script:cleanupAttempts=0
  Remove-GrMetroUpgradeRoot $cleanupInstall -MaximumAttempts 3 -DelayMilliseconds 0 -RemovalAction {param($target,$attempt);$script:cleanupAttempts++;if($attempt -eq 1){throw [IO.IOException]::new('The directory is not empty.')};Remove-Item -LiteralPath $target -Recurse -Force} -DelayAction {}
  Assert ($script:cleanupAttempts -eq 2 -and -not(Test-Path -LiteralPath $cleanupRoot)) 'Transient cleanup did not succeed on a later bounded retry.'

  Write-Fixture (Join-Path $cleanupRoot 'persistent.txt') 'persistent'
  $script:cleanupAttempts=0;$cleanupFailure=''
  try{Remove-GrMetroUpgradeRoot $cleanupInstall -MaximumAttempts 3 -DelayMilliseconds 0 -RemovalAction {param($target,$attempt);$script:cleanupAttempts++;throw [IO.IOException]::new('The directory is not empty.')} -DelayAction {}}catch{$cleanupFailure=$_.Exception.Message}
  Assert ($script:cleanupAttempts -eq 3 -and (Test-Path -LiteralPath $cleanupRoot)) 'Retry exhaustion did not preserve remaining transaction evidence.'
  Assert ($cleanupFailure -match 'did not finish after 3 attempts') 'Retry exhaustion omitted actionable cleanup detail.'

  $script:cleanupAttempts=0;$accessDenied=$false
  try{Remove-GrMetroUpgradeRoot $cleanupInstall -RemovalAction {param($target,$attempt);$script:cleanupAttempts++;throw [UnauthorizedAccessException]::new('Access denied.')} -DelayAction {}}catch{$accessDenied=$_.Exception -is [UnauthorizedAccessException]}
  Assert ($accessDenied -and $script:cleanupAttempts -eq 1 -and (Test-Path -LiteralPath $cleanupRoot)) 'Access denied was retried or swallowed.'

  $outsideSentinel=Join-Path $fixture 'cleanup-outside-sentinel.txt';Write-Fixture $outsideSentinel 'outside'
  Remove-GrMetroUpgradeRoot $cleanupInstall -RemovalAction {param($target,$attempt);Assert ($target -eq $cleanupRoot) 'Cleanup crossed its validated transaction root.';Remove-Item -LiteralPath $target -Recurse -Force} -DelayAction {}
  Assert ((Get-Content -LiteralPath $outsideSentinel -Raw)-eq'outside') 'Cleanup modified a sibling outside the transaction root.'
  Write-Output 'PASS: transaction cleanup handles absent-after-error, bounded retry, exhaustion, access denial, and root containment.'

  # Reproduce the deployed version transition that exposed the .env.example bug:
  # the previous package inventory does not contain the newly introduced file,
  # while the next package adds it and removes an obsolete application file.
  $transitionOldSource=Join-Path $fixture 'transition previous package'
  $transitionNewSource=Join-Path $fixture 'transition current package'
  $transitionInstall=Join-Path $fixture 'transition installed/Performance Center'
  $transitionRollbackInstall=Join-Path $fixture 'transition rollback installed/Performance Center'
  $transitionOldZip=Join-Path $fixture 'transition-previous.zip'
  $transitionNewZip=Join-Path $fixture 'transition-current.zip'
  $transitionAdded='scripts/windows/new-version-tool.ps1'
  $transitionPortableFiles=@('package.json','apps/backend/src/index.js','scripts/windows/package-manifest.json','scripts/windows/package-build.json','scripts/windows/package-files.ps1','scripts/windows/process-control.ps1','scripts/windows/launch-integration.ps1','scripts/windows/release-identity.ps1','scripts/windows/application-validation.ps1','scripts/windows/env-wizard.ps1','scripts/windows/servicetitan-profile.ps1','scripts/windows/manual-legacy-upgrade.ps1','GRMetro Performance Center.exe','scripts/windows/runtime-versions.json','scripts/windows/runtime-paths.ps1','apps/dashboard/dist/index.html','runtime/node/node.exe','runtime/node/LICENSE','runtime/node/VERSION','node_modules/express/package.json','node_modules/playwright/package.json','node_modules/qrcode-terminal/package.json')
  $transitionNodeFiles=@(1..180|ForEach-Object{"node_modules/upgrade-fixture/file-$_.js"})
  $transitionOldFiles=@($transitionPortableFiles)+$transitionNodeFiles+$obsoletePath
  $transitionNewFiles=@($transitionPortableFiles)+$transitionNodeFiles+'.env.example'+$transitionAdded
  $transitionOldManifest=[ordered]@{version=2;files=@($transitionOldFiles|Sort-Object -Unique)}
  $transitionNewManifest=[ordered]@{version=2;files=@($transitionNewFiles|Sort-Object -Unique)}
  $transitionOldManifestText=($transitionOldManifest|ConvertTo-Json -Depth 3)+[Environment]::NewLine
  $transitionNewManifestText=($transitionNewManifest|ConvertTo-Json -Depth 3)+[Environment]::NewLine
  foreach($relative in $transitionOldFiles){if($relative -ne $manifestPath){Write-Fixture (Join-Path $transitionOldSource $relative) ('previous '+$relative)}}
  foreach($relative in $transitionNewFiles){if($relative -ne $manifestPath){Write-Fixture (Join-Path $transitionNewSource $relative) ('current '+$relative)}}
  Write-Fixture (Join-Path $transitionOldSource $manifestPath) $transitionOldManifestText
  Write-Fixture (Join-Path $transitionNewSource $manifestPath) $transitionNewManifestText
  [IO.Compression.ZipFile]::CreateFromDirectory($transitionOldSource,$transitionOldZip)
  [IO.Compression.ZipFile]::CreateFromDirectory($transitionNewSource,$transitionNewZip)
  # This is an already-deployed historical version. Extract it exactly as the old
  # Setup payload was installed; current incoming-package requirements must not be
  # imposed while reading its installed inventory.
  [IO.Compression.ZipFile]::ExtractToDirectory($transitionOldZip,$transitionInstall)
  [IO.Compression.ZipFile]::ExtractToDirectory($transitionOldZip,$transitionRollbackInstall)
  foreach($root in @($transitionInstall,$transitionRollbackInstall)){foreach($relative in @('.env','data/company-config.json','data/goals.json','data/display-settings.json','data/management-dismissals.json','apps/backend/data/spreadsheet-slide.json','logs/supervisor.log')){Write-Fixture (Join-Path $root $relative) ('PERSIST '+$relative)}}
  Assert (-not(Test-Path -LiteralPath (Join-Path $transitionInstall '.env.example'))) 'Previous-version fixture unexpectedly installed .env.example.'
  Install-GrMetroPackageFiles $transitionNewZip $transitionInstall
  Assert ((Get-Content -LiteralPath (Join-Path $transitionInstall '.env.example') -Raw)-eq 'current .env.example') 'Newly introduced .env.example was not installed.'
  Assert ((Get-Content -LiteralPath (Join-Path $transitionInstall $transitionAdded) -Raw)-eq ('current '+$transitionAdded)) 'Another newly introduced application file was not installed.'
  Assert (-not(Test-Path -LiteralPath (Join-Path $transitionInstall $obsoletePath))) 'Obsolete previous-version file survived the real transition.'
  foreach($relative in @('.env','data/company-config.json','data/goals.json','data/display-settings.json','data/management-dismissals.json','apps/backend/data/spreadsheet-slide.json','logs/supervisor.log')){Assert ((Get-Content -LiteralPath (Join-Path $transitionInstall $relative)-Raw)-eq ('PERSIST '+$relative)) "Successful transition modified persistent data: $relative"}

  # Fail a later current-version copy over a second exact previous installation.
  # Rollback must recover common/obsolete files and remove every newly added file.
  $transitionFailed=$false
  try{Install-GrMetroPackageFiles $transitionNewZip $transitionRollbackInstall -FailureInjector {param($phase,$relative);if($phase -eq 'replace' -and $relative -eq $manifestPath){throw 'Injected version-transition failure.'}}}catch{$transitionFailed=$_.Exception.Message -match 'Injected version-transition failure'}
  Assert $transitionFailed 'Version-transition rollback failure was not injected.'
  foreach($relative in $transitionOldFiles){Assert (Test-Path -LiteralPath (Join-Path $transitionRollbackInstall $relative)-PathType Leaf) "Rollback lost previous application file: $relative"}
  Assert ((Get-Content -LiteralPath (Join-Path $transitionRollbackInstall 'apps/backend/src/index.js')-Raw)-eq 'previous apps/backend/src/index.js') 'Rollback did not restore the previous common application file.'
  Assert ((Get-Content -LiteralPath (Join-Path $transitionRollbackInstall $obsoletePath)-Raw)-eq ('previous '+$obsoletePath)) 'Rollback did not restore the obsolete previous-version file.'
  Assert (-not(Test-Path -LiteralPath (Join-Path $transitionRollbackInstall '.env.example'))) 'Rollback retained newly introduced .env.example.'
  Assert (-not(Test-Path -LiteralPath (Join-Path $transitionRollbackInstall $transitionAdded))) 'Rollback retained another newly introduced file.'
  foreach($relative in @('.env','data/company-config.json','data/goals.json','data/display-settings.json','data/management-dismissals.json','apps/backend/data/spreadsheet-slide.json','logs/supervisor.log')){Assert ((Get-Content -LiteralPath (Join-Path $transitionRollbackInstall $relative)-Raw)-eq ('PERSIST '+$relative)) "Failed transition modified persistent data: $relative"}
  Write-Output 'PASS: previous package without .env.example upgrades successfully; rollback restores its exact file set.'

  # The production failure left a version-1 "prepared" journal from the prior
  # payload. Prove a fully applied stale transaction by comparing the complete
  # installation with its retained stage, then clean it without requiring a
  # missing backup and continue into the next upgrade deterministically.
  $staleAppliedInstall=Join-Path $fixture 'stale applied installed/Performance Center'
  [IO.Compression.ZipFile]::ExtractToDirectory($transitionNewZip,$staleAppliedInstall)
  $staleUpgrade=Get-GrMetroUpgradeRoot $staleAppliedInstall
  New-Item -ItemType Directory -Force -Path $staleUpgrade | Out-Null
  Copy-Item -LiteralPath $transitionNewSource -Destination (Join-Path $staleUpgrade 'stage') -Recurse
  foreach($relative in $transitionNewFiles|Where-Object{$_ -ne '.env.example'}){Write-Fixture (Get-GrMetroPackageDestination (Join-Path $staleUpgrade 'backup') $relative) ('previous-backup '+$relative)}
  $staleJournal=[ordered]@{version=1;status='prepared';installRoot=[IO.Path]::GetFullPath($staleAppliedInstall).TrimEnd('\');files=@($transitionNewFiles|Sort-Object|ForEach-Object{[ordered]@{path=$_;existed=$true}})}
  Write-GrMetroUpgradeJournal (Join-Path $staleUpgrade 'journal.json') $staleJournal
  Assert (-not(Restore-GrMetroUpgradeTransaction $staleAppliedInstall)) 'Fully applied stale transaction incorrectly attempted rollback.'
  Assert (-not(Test-Path -LiteralPath $staleUpgrade)) 'Verified stale transaction evidence was not cleaned.'
  Install-GrMetroPackageFiles $transitionNewZip $staleAppliedInstall
  Assert (Test-Path -LiteralPath (Join-Path $staleAppliedInstall '.env.example')-PathType Leaf) 'Upgrade did not continue after deterministic stale-transaction recovery.'
  Write-Output 'PASS: verified legacy prepared transaction is classified and a subsequent upgrade proceeds.'

  function New-InterruptedCleanupFixture([string]$name) {
    $root=Join-Path $fixture $name
    [IO.Compression.ZipFile]::ExtractToDirectory($transitionNewZip,$root)
    Copy-Item -LiteralPath (Join-Path $repository '.env.example') -Destination (Join-Path $root '.env.example') -Force
    foreach($relative in @('.env','data/company-config.json','data/goals.json','data/display-settings.json','data/management-dismissals.json','apps/backend/data/spreadsheet-slide.json')){Write-Fixture (Join-Path $root $relative) ('PRIVATE '+$relative)}
    $upgrade=Get-GrMetroUpgradeRoot $root;$backup=Join-Path $upgrade 'backup';New-Item -ItemType Directory -Force -Path $backup|Out-Null
    $ordered=@($transitionNewFiles|Sort-Object -Unique);$surviving=@($ordered|Select-Object -Skip 45)
    foreach($relative in $surviving){$destination=Get-GrMetroPackageDestination $backup $relative;New-Item -ItemType Directory -Force -Path ([IO.Path]::GetDirectoryName($destination))|Out-Null;Copy-Item -LiteralPath (Join-Path $root $relative) -Destination $destination -Force}
    $journal=[ordered]@{version=1;status='prepared';installRoot=[IO.Path]::GetFullPath($root).TrimEnd('\');files=@($ordered|ForEach-Object{[ordered]@{path=$_;existed=$true}})}
    Write-GrMetroUpgradeJournal (Join-Path $upgrade 'journal.json') $journal
    return [pscustomobject]@{Root=$root;Upgrade=$upgrade;Backup=$backup;Surviving=$surviving;Missing=@($ordered|Select-Object -First 45)}
  }

  $cleanupFixture=New-InterruptedCleanupFixture 'interrupted rollback cleanup'
  Assert ((Get-GrMetroUpgradeRecoveryAction $cleanupFixture.Root)-eq'cleanup') 'Proven interrupted rollback cleanup was not accepted.'
  Assert (-not(Restore-GrMetroUpgradeTransaction $cleanupFixture.Root)) 'Interrupted rollback cleanup incorrectly rewrote application files.'
  Assert (-not(Test-Path -LiteralPath $cleanupFixture.Upgrade)) 'Interrupted rollback cleanup evidence was not retired.'
  foreach($relative in @('.env','data/company-config.json','data/goals.json','data/display-settings.json','data/management-dismissals.json','apps/backend/data/spreadsheet-slide.json')){Assert ((Get-Content -LiteralPath (Join-Path $cleanupFixture.Root $relative)-Raw)-eq ('PRIVATE '+$relative)) "Cleanup classifier touched persistent data: $relative"}
  Install-GrMetroPackageFiles $transitionNewZip $cleanupFixture.Root
  Write-Fixture (Join-Path $cleanupFixture.Root 'apps/backend/src/index.js') 'stable after stale cleanup'
  $postCleanupFailure=$false
  try{Install-GrMetroPackageFiles $transitionNewZip $cleanupFixture.Root -FailureInjector {param($phase,$relative);if($phase -eq 'replace' -and $relative -eq $manifestPath){throw 'Post-cleanup upgrade failure.'}}}catch{$postCleanupFailure=$_.Exception.Message -match 'Post-cleanup upgrade failure'}
  Assert $postCleanupFailure 'Post-cleanup upgrade failure was not injected.'
  Assert ((Get-Content -LiteralPath (Join-Path $cleanupFixture.Root 'apps/backend/src/index.js')-Raw)-eq'stable after stale cleanup') 'Post-cleanup upgrade did not roll back.'

  $mismatchFixture=New-InterruptedCleanupFixture 'cleanup mismatch refusal'
  Write-Fixture (Get-GrMetroPackageDestination $mismatchFixture.Backup $mismatchFixture.Surviving[0]) 'mismatched backup'
  Expect-Failure {Get-GrMetroUpgradeRecoveryAction $mismatchFixture.Root} 'Cleanup classifier accepted a surviving backup mismatch.'
  Assert (Test-Path -LiteralPath $mismatchFixture.Upgrade) 'Mismatch refusal deleted transaction evidence.'

  $missingFixture=New-InterruptedCleanupFixture 'cleanup missing installed refusal'
  Remove-Item -LiteralPath (Join-Path $missingFixture.Root 'apps/backend/src/index.js') -Force
  Expect-Failure {Get-GrMetroUpgradeRecoveryAction $missingFixture.Root} 'Cleanup classifier accepted a missing installed packaged file.'

  $manifestMismatchFixture=New-InterruptedCleanupFixture 'cleanup manifest mismatch refusal'
  $changedManifest=Get-Content -LiteralPath (Join-Path $manifestMismatchFixture.Root $manifestPath)-Raw|ConvertFrom-Json
  $changedManifest.files=@($changedManifest.files|Where-Object{$_ -ne 'apps/backend/src/index.js'})
  Write-Fixture (Join-Path $manifestMismatchFixture.Root $manifestPath) (($changedManifest|ConvertTo-Json -Depth 4)+[Environment]::NewLine)
  Expect-Failure {Get-GrMetroUpgradeRecoveryAction $manifestMismatchFixture.Root} 'Cleanup classifier accepted a manifest/journal inventory mismatch.'

  $hashErrorFixture=New-InterruptedCleanupFixture 'cleanup hash error refusal'
  $lockedBackup=Get-GrMetroPackageDestination $hashErrorFixture.Backup $hashErrorFixture.Surviving[0]
  $hashLock=[IO.File]::Open($lockedBackup,[IO.FileMode]::Open,[IO.FileAccess]::Read,[IO.FileShare]::None)
  try{Expect-Failure {Get-GrMetroUpgradeRecoveryAction $hashErrorFixture.Root} 'Cleanup classifier accepted an unreadable surviving backup.'}finally{$hashLock.Dispose()}

  $partialFixture=New-InterruptedCleanupFixture 'cleanup partial application refusal'
  New-Item -ItemType Directory -Force -Path (Join-Path $partialFixture.Upgrade 'stage')|Out-Null
  Copy-Item -LiteralPath $transitionNewSource -Destination (Join-Path $partialFixture.Upgrade 'stage') -Recurse -Force
  Write-Fixture (Join-Path $partialFixture.Root 'apps/backend/src/index.js') 'partially applied content'
  Expect-Failure {Get-GrMetroUpgradeRecoveryAction $partialFixture.Root} 'Cleanup classifier accepted a genuinely partial installation.'
  Write-Output 'PASS: no-stage interrupted cleanup requires complete positive evidence and rejects every negative case.'

  Install-GrMetroPackageFiles $zip $installed
  Assert ((Get-Content -LiteralPath (Join-Path $installed 'apps/backend/src/index.js') -Raw) -eq 'application apps/backend/src/index.js') 'Application was not upgraded.'
  Assert (-not (Test-Path -LiteralPath (Join-Path $installed $obsoletePath))) 'Manifest-listed obsolete application file survived upgrade.'
  foreach ($relative in $privatePaths) { Assert ((Get-Content -LiteralPath (Join-Path $installed $relative) -Raw) -eq ('PRESERVE ' + $relative)) "Reinstall modified local file: $relative" }

  # A clean install may defer transaction cleanup until its post-install wizard
  # succeeds. Failure must remove the new application; success commits it.
  $deferredInstall = Join-Path $fixture 'deferred clean install'
  Install-GrMetroPackageFiles $zip $deferredInstall -DeferCommitCleanup
  Assert (Test-Path -LiteralPath (Get-GrMetroUpgradeRoot $deferredInstall)) 'Deferred clean install did not retain a recovery transaction.'
  Assert (Test-Path -LiteralPath (Join-Path $deferredInstall 'apps/backend/src/index.js')) 'Deferred clean install did not publish application files.'
  Assert (Restore-GrMetroUpgradeTransaction $deferredInstall) 'Deferred clean-install failure did not roll back.'
  Assert (-not (Test-Path -LiteralPath (Join-Path $deferredInstall 'apps/backend/src/index.js'))) 'Failed clean install left application files behind.'
  Install-GrMetroPackageFiles $zip $deferredInstall -DeferCommitCleanup
  Complete-GrMetroUpgradeTransaction $deferredInstall
  Assert (-not (Test-Path -LiteralPath (Get-GrMetroUpgradeRoot $deferredInstall))) 'Completed deferred install left a recovery transaction.'
  Assert (Test-Path -LiteralPath (Join-Path $deferredInstall 'apps/backend/src/index.js')) 'Completed deferred install removed application files.'

  $powerShellProbe = Join-Path $fixture 'wizard launch probe.ps1'
  Write-Fixture $powerShellProbe '[Console]::WriteLine("cwd=" + [Environment]::CurrentDirectory); [Console]::WriteLine("apartment=" + [Threading.Thread]::CurrentThread.ApartmentState)'
  $probeResult = Invoke-GrMetroPowerShellScript -ScriptPath $powerShellProbe -WorkingDirectory $deferredInstall -Sta
  Assert ($probeResult.ExitCode -eq 0) 'STA wizard launch probe failed.'
  Assert ($probeResult.StdOut -match 'apartment=STA') 'Wizard helper did not use STA mode.'
  Assert ($probeResult.WorkingDirectory -eq [IO.Path]::GetFullPath($deferredInstall)) 'Wizard helper used the wrong working directory.'
  $powerShellFailure = Join-Path $fixture 'wizard failure probe.ps1'
  Write-Fixture $powerShellFailure 'throw "pre-window failure marker"'
  $failureResult = Invoke-GrMetroPowerShellScript -ScriptPath $powerShellFailure -WorkingDirectory $deferredInstall -Sta
  $failureMessage = Format-GrMetroScriptFailure $failureResult 'Configuration wizard'
  Assert ($failureResult.ExitCode -ne 0 -and $failureMessage -match 'pre-window failure marker') 'Wizard helper lost the pre-window PowerShell exception.'
  Assert ($failureMessage -match [regex]::Escape($powerShellFailure)) 'Wizard failure omitted the script path.'

  # A failure after every replacement and obsolete deletion must restore the
  # complete prior application, including its old manifest and obsolete file.
  Write-Fixture (Join-Path $installed 'apps/backend/src/index.js') 'stable application before failed upgrade'
  Write-Fixture (Join-Path $installed $manifestPath) $oldManifestText
  Write-Fixture (Join-Path $installed $obsoletePath) 'restore obsolete file'
  $failedAtObsoleteRemoval = $false
  try {
    Install-GrMetroPackageFiles $zip $installed -FailureInjector {
      param($phase, $relative)
      if ($phase -eq 'remove-obsolete' -and $relative -eq $obsoletePath) { throw 'Injected upgrade failure.' }
    }
  } catch {
    $failedAtObsoleteRemoval = $_.Exception.Message -match 'Injected upgrade failure'
  }
  Assert $failedAtObsoleteRemoval 'Failed-upgrade injection did not run.'
  Assert ((Get-Content -LiteralPath (Join-Path $installed 'apps/backend/src/index.js') -Raw) -eq 'stable application before failed upgrade') 'Rollback did not restore replaced application file.'
  Assert ((Get-Content -LiteralPath (Join-Path $installed $obsoletePath) -Raw) -eq 'restore obsolete file') 'Rollback did not restore removed obsolete application file.'
  Assert ((Get-Content -LiteralPath (Join-Path $installed $manifestPath) -Raw) -eq $oldManifestText) 'Rollback did not restore the prior manifest.'
  Assert (-not (Test-Path -LiteralPath (Get-GrMetroUpgradeRoot $installed))) 'Completed rollback left a transaction directory.'
  foreach ($relative in $privatePaths) { Assert ((Get-Content -LiteralPath (Join-Path $installed $relative) -Raw) -eq ('PRESERVE ' + $relative)) "Failed upgrade modified local file: $relative" }

  # Preserve both actionable failures when application replacement and rollback
  # fail independently; never replace the original cause with the rollback error.
  $dualFailureInstall=Join-Path $fixture 'dual failure installed'
  Install-GrMetroPackageFiles $zip $dualFailureInstall
  $dualFailureMessage=''
  try{Install-GrMetroPackageFiles $zip $dualFailureInstall -FailureInjector {param($phase,$relative);if($phase -eq 'replace' -and $relative -eq $manifestPath){Remove-Item -LiteralPath (Get-GrMetroPackageDestination (Join-Path (Get-GrMetroUpgradeRoot $dualFailureInstall) 'backup') '.env.example') -Force;throw 'Original locked-file failure.'}}}catch{$dualFailureMessage=$_.Exception.Message}
  Assert ($dualFailureMessage -match 'Upgrade failed: Original locked-file failure') 'Original upgrade failure was obscured.'
  Assert ($dualFailureMessage -match 'Automatic rollback also failed: Upgrade backup missing: \.env\.example') 'Rollback failure was not reported alongside the original failure.'
  Assert (Test-Path -LiteralPath (Get-GrMetroUpgradeRoot $dualFailureInstall)) 'Failed rollback discarded transaction evidence.'
  Remove-GrMetroUpgradeRoot $dualFailureInstall

  # A real exclusive file handle simulates a running/locked packaged executable.
  # The first attempt must fail before mutation; releasing the handle permits retry.
  $lockInstall=Join-Path $fixture 'locked file installed'
  Install-GrMetroPackageFiles $zip $lockInstall
  $lockedPath=Join-Path $lockInstall 'GRMetro Performance Center.exe'
  $lockStream=[IO.File]::Open($lockedPath,[IO.FileMode]::Open,[IO.FileAccess]::Read,[IO.FileShare]::None)
  try{Expect-Failure {Install-GrMetroPackageFiles $zip $lockInstall} 'Upgrade unexpectedly replaced an exclusively locked executable.'}finally{$lockStream.Dispose()}
  Assert (-not(Test-Path -LiteralPath (Get-GrMetroUpgradeRoot $lockInstall))) 'Pre-mutation lock failure left a transaction behind.'
  Install-GrMetroPackageFiles $zip $lockInstall
  Assert (Test-Path -LiteralPath $lockedPath -PathType Leaf) 'Upgrade did not succeed after the lock was released.'
  Write-Output 'PASS: locked-file retry and dual-failure diagnostics preserve transaction safety.'

  # Simulate process termination after the journal commit and one replacement.
  # The next recovery call must restore the prior file before removing the journal.
  $upgradeRoot = Get-GrMetroUpgradeRoot $installed
  $backup = Get-GrMetroPackageDestination (Join-Path $upgradeRoot 'backup') 'apps/backend/src/index.js'
  Write-Fixture $backup 'application before interruption'
  Write-Fixture (Join-Path $installed 'apps/backend/src/index.js') 'partially replaced application'
  New-Item -ItemType Directory -Force -Path $upgradeRoot | Out-Null
  $journal = [ordered]@{ version=1; status='prepared'; installRoot=[IO.Path]::GetFullPath($installed).TrimEnd('\'); files=@([ordered]@{path='apps/backend/src/index.js';existed=$true}) }
  Write-GrMetroUpgradeJournal (Join-Path $upgradeRoot 'journal.json') $journal
  Assert (Restore-GrMetroUpgradeTransaction $installed) 'Interrupted transaction was not detected.'
  Assert ((Get-Content -LiteralPath (Join-Path $installed 'apps/backend/src/index.js') -Raw) -eq 'application before interruption') 'Interrupted upgrade recovery did not restore the application.'
  Assert (-not (Test-Path -LiteralPath $upgradeRoot)) 'Interrupted upgrade recovery left a transaction directory.'

  # Recovery preflights every legacy backup before restoring anything, so one
  # corrupt/missing backup cannot leave the prior application half-restored.
  $legacyCorrupt=Join-Path $fixture 'legacy corrupt transaction'
  $legacyFirst='apps/backend/src/index.js';$legacySecond='.env.example'
  Write-Fixture (Join-Path $legacyCorrupt $legacyFirst) 'current first file'
  Write-Fixture (Join-Path $legacyCorrupt $legacySecond) 'current second file'
  $legacyUpgrade=Get-GrMetroUpgradeRoot $legacyCorrupt
  Write-Fixture (Get-GrMetroPackageDestination (Join-Path $legacyUpgrade 'backup') $legacyFirst) 'previous first file'
  $legacyJournal=[ordered]@{version=1;status='prepared';installRoot=[IO.Path]::GetFullPath($legacyCorrupt).TrimEnd('\');files=@([ordered]@{path=$legacyFirst;existed=$true},[ordered]@{path=$legacySecond;existed=$true})}
  Write-GrMetroUpgradeJournal (Join-Path $legacyUpgrade 'journal.json') $legacyJournal
  Expect-Failure { Restore-GrMetroUpgradeTransaction $legacyCorrupt } 'Legacy recovery accepted a missing backup.'
  Assert ((Get-Content -LiteralPath (Join-Path $legacyCorrupt $legacyFirst)-Raw)-eq 'current first file') 'Legacy recovery changed files before completing backup preflight.'
  Remove-GrMetroUpgradeRoot $legacyCorrupt

  # A version-2 prepared journal is explicitly pre-mutation and can be removed
  # safely even if its backup directory is incomplete.
  $preparedInstall=Join-Path $fixture 'prepared before mutation'
  Write-Fixture (Join-Path $preparedInstall $legacyFirst) 'untouched application'
  $preparedUpgrade=Get-GrMetroUpgradeRoot $preparedInstall
  New-Item -ItemType Directory -Force -Path $preparedUpgrade | Out-Null
  $preparedJournal=[ordered]@{version=2;status='prepared';installRoot=[IO.Path]::GetFullPath($preparedInstall).TrimEnd('\');files=@([ordered]@{path=$legacyFirst;existed=$true;backupSha256='missing'})}
  Write-GrMetroUpgradeJournal (Join-Path $preparedUpgrade 'journal.json') $preparedJournal
  Assert (-not(Restore-GrMetroUpgradeTransaction $preparedInstall)) 'Pre-mutation journal incorrectly reported an application rollback.'
  Assert ((Get-Content -LiteralPath (Join-Path $preparedInstall $legacyFirst)-Raw)-eq 'untouched application') 'Pre-mutation recovery changed the installed application.'
  Assert (-not(Test-Path -LiteralPath $preparedUpgrade)) 'Pre-mutation recovery left its transaction directory.'

  # A clean retry succeeds and removes obsolete files while preserving local data.
  Install-GrMetroPackageFiles $zip $installed
  Assert ((Get-Content -LiteralPath (Join-Path $installed 'apps/backend/src/index.js') -Raw) -eq 'application apps/backend/src/index.js') 'Retry after rollback did not upgrade the application.'
  Assert (-not (Test-Path -LiteralPath (Join-Path $installed $obsoletePath))) 'Retry did not remove obsolete application file.'
  foreach ($relative in $privatePaths) { Assert ((Get-Content -LiteralPath (Join-Path $installed $relative) -Raw) -eq ('PRESERVE ' + $relative)) "Retry modified local file: $relative" }

  # Reject unexpected/private/traversal entries before even overwriting application code.
  foreach ($badPath in @('.env','data/goals.json','data/management-dismissals.json','apps/backend/data/spreadsheet-slide.json','../escape.txt','scripts/windows/unlisted.ps1')) {
    $badZip = Join-Path $fixture 'bad.zip'
    Copy-Item -LiteralPath $zip -Destination $badZip -Force
    $archive = [IO.Compression.ZipFile]::Open($badZip, 'Update')
    try { $null = $archive.CreateEntry($badPath) } finally { $archive.Dispose() }
    Write-Fixture (Join-Path $installed 'apps/backend/src/index.js') 'unchanged on rejection'
    Expect-Failure { Install-GrMetroPackageFiles $badZip $installed } "Accepted bad entry: $badPath"
    Assert ((Get-Content -LiteralPath (Join-Path $installed 'apps/backend/src/index.js') -Raw) -eq 'unchanged on rejection') 'Rejected archive changed the installation.'
  }
  foreach ($badPath in @('.env','data/company-config.json','data/management-dismissals.json','apps/backend/data/goals.json','apps/backend/src/local.private.json','apps/backend/src/../data/goals.json','scripts/windows/../secrets.ps1','C:/outside.txt')) {
    Expect-Failure { Get-GrMetroPackageFiles ([pscustomobject]@{version=1;files=@($files)+$badPath}) } "Manifest admitted private/unsafe path: $badPath"
  }
  Write-Fixture (Join-Path $fixture 'invalid.zip') 'not an archive'
  Expect-Failure { Install-GrMetroPackageFiles (Join-Path $fixture 'invalid.zip') $installed } 'Accepted corrupt archive.'
  Write-Output 'PASS: transactional upgrade, rollback/recovery, obsolete cleanup, persistent preservation, and archive rejection.'

  Add-Type -AssemblyName PresentationFramework,PresentationCore,WindowsBase
  foreach ($file in Get-ChildItem (Join-Path $repository 'scripts/windows/*.ps1')) {
    $tokens=$null; $parseErrors=$null
    $ast=[Management.Automation.Language.Parser]::ParseFile($file.FullName,[ref]$tokens,[ref]$parseErrors)
    Assert ($parseErrors.Count -eq 0) "PowerShell parse error: $($file.Name)"
    $markup=$ast.FindAll({param($node) $node -is [Management.Automation.Language.StringConstantExpressionAst] -and $node.Value.TrimStart().StartsWith('<Window')},$true)
    foreach ($literal in $markup) {
      $xml=[xml]$literal.Value
      $window=[Windows.Markup.XamlReader]::Load((New-Object Xml.XmlNodeReader $xml))
      if ($file.Name -eq 'env-wizard.ps1') {
        foreach ($name in @('BusinessUnits','Technicians','Timezone','Autostart','Firewall','ErrorText','Save','Cancel')) { Assert ($null -ne $window.FindName($name)) "Missing wizard control: $name" }
      }
      if ($file.Name -eq 'performance-center-launcher-v2.ps1') {
        Assert ($window.WindowState -eq [Windows.WindowState]::Maximized) 'Native control center does not default to normal maximized state.'
        Assert ($window.WindowStyle -ne [Windows.WindowStyle]::None) 'Native control center lost its normal title bar.'
        Assert ($window.ResizeMode -ne [Windows.ResizeMode]::NoResize) 'Native control center cannot be restored or resized.'
      }
      $window.Close()
    }
  }
  Write-Output 'PASS: all Windows scripts parse; WPF windows construct without being shown.'

  # Setup installs the stable host beside, never inside, the replaceable application.
  $installerAst=[Management.Automation.Language.Parser]::ParseFile((Join-Path $repository 'scripts/windows/install-grmetro-performance-center.ps1'),[ref]$tokens,[ref]$parseErrors)
  foreach($name in @('Install-GrMetroStableUpdateHost','Complete-GrMetroStableUpdateHost','Restore-GrMetroStableUpdateHost')){$function=$installerAst.Find({param($node)$node -is [Management.Automation.Language.FunctionDefinitionAst] -and $node.Name -eq $name},$true);Invoke-Expression $function.Extent.Text}
  $hostBundleSource=Join-Path $fixture 'host bundle source';$hostBundleZip=Join-Path $fixture 'host bundle.zip'
  foreach($name in @('GRMetro Update Host.exe','update-host.ps1','package-files.ps1','process-control.ps1','application-validation.ps1','release-identity.ps1','authenticode-signing.ps1')){Write-Fixture (Join-Path $hostBundleSource $name) ('HOST '+$name)}
  Copy-Item -LiteralPath (Join-Path $repository 'scripts/windows/release-feed.ps1') -Destination (Join-Path $hostBundleSource 'release-feed.ps1')
  Write-Fixture (Join-Path $hostBundleSource 'release-source.default.json') '{"schemaVersion":1,"enabled":false,"metadataUrl":"","signatureUrl":"","channel":"stable","allowedHosts":[],"connectionTimeoutSeconds":10,"responseTimeoutSeconds":30,"maximumMetadataBytes":262144,"maximumArtifactBytes":268435456,"maximumRedirects":3}'
  Write-Fixture (Join-Path $hostBundleSource 'release-public-keys.json') '{"schemaVersion":1,"keys":[]}'
  Write-Fixture (Join-Path $hostBundleSource 'provisioning-policy.json') '{"schemaVersion":1,"applyOnSetup":false,"updaterProtocol":1}'
  [IO.Compression.ZipFile]::CreateFromDirectory($hostBundleSource,$hostBundleZip)
  $savedLocalAppData=$env:LOCALAPPDATA;$env:LOCALAPPDATA=Join-Path $fixture 'local app data'
  try{$hostState=Install-GrMetroStableUpdateHost $hostBundleZip}finally{$env:LOCALAPPDATA=$savedLocalAppData}
  $hostRoot=Join-Path $fixture 'local app data/GRMetro/Update Host'
  Assert (Test-Path -LiteralPath (Join-Path $hostRoot 'GRMetro Update Host.exe')-PathType Leaf) 'Setup did not install the stable Update Host outside the app tree.'
  Assert (-not([IO.Path]::GetFullPath($hostRoot).StartsWith([IO.Path]::GetFullPath($installed).TrimEnd('\')+'\',[StringComparison]::OrdinalIgnoreCase))) 'Setup installed the Update Host inside the replaceable application.'
  Restore-GrMetroStableUpdateHost $hostState
  Assert (-not(Test-Path -LiteralPath $hostRoot)) 'Failed Setup did not remove a newly introduced Update Host.'
  $env:LOCALAPPDATA=Join-Path $fixture 'local app data';try{$hostState=Install-GrMetroStableUpdateHost $hostBundleZip;Complete-GrMetroStableUpdateHost $hostState}finally{$env:LOCALAPPDATA=$savedLocalAppData}
  Assert ((Test-Path -LiteralPath $hostRoot) -and -not(Test-Path -LiteralPath (Join-Path $fixture 'local app data/GRMetro/Update Host.previous'))) 'Successful Setup did not commit Update Host installation.'
  Write-Fixture (Join-Path $hostRoot 'GRMetro Update Host.exe') 'PREVIOUS HOST'
  $env:LOCALAPPDATA=Join-Path $fixture 'local app data';try{$hostState=Install-GrMetroStableUpdateHost $hostBundleZip}finally{$env:LOCALAPPDATA=$savedLocalAppData}
  Restore-GrMetroStableUpdateHost $hostState
  Assert ((Get-Content -LiteralPath (Join-Path $hostRoot 'GRMetro Update Host.exe')-Raw)-eq'PREVIOUS HOST') 'Failed Setup did not restore the previous stable Update Host.'
  Write-Output 'PASS: Setup atomically installs the stable Update Host outside the replaceable application.'

  # The upgrade quiesce targets only processes executing packaged GRMetro files.
  # Dedicated/normal Edge and unrelated Node/PowerShell processes remain untouched.
  $processControlAst=[Management.Automation.Language.Parser]::ParseFile((Join-Path $repository 'scripts/windows/process-control.ps1'),[ref]$tokens,[ref]$parseErrors)
  foreach($name in @('Get-GrMetroOwnedUpgradeProcesses','Stop-GrMetroUpgradeProcesses')){$function=$processControlAst.Find({param($node)$node -is [Management.Automation.Language.FunctionDefinitionAst] -and $node.Name -eq $name},$true);Invoke-Expression $function.Extent.Text}
  $processInstall=Join-Path $fixture 'process target/Performance Center';New-Item -ItemType Directory -Force -Path $processInstall|Out-Null
  $script:mockProcesses=@(
    [pscustomobject]@{ProcessId=41001;Name='powershell.exe';ExecutablePath='C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe';CommandLine="powershell -File `"$processInstall\scripts\windows\performance-center-supervisor.ps1`""},
    [pscustomobject]@{ProcessId=41002;Name='powershell.exe';ExecutablePath='C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe';CommandLine="powershell -File `"$processInstall\scripts\windows\performance-center-launcher-host.ps1`""},
    [pscustomobject]@{ProcessId=41003;Name='node.exe';ExecutablePath=(Join-Path $processInstall 'runtime\node\node.exe');CommandLine='node apps/backend/src/index.js'},
    [pscustomobject]@{ProcessId=41004;Name='GRMetro Performance Center.exe';ExecutablePath=(Join-Path $processInstall 'GRMetro Performance Center.exe');CommandLine=''},
    [pscustomobject]@{ProcessId=41005;Name='msedge.exe';ExecutablePath='C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe';CommandLine='msedge --user-data-dir="C:\Users\test\AppData\Local\GRMetro\Edge Profile"'},
    [pscustomobject]@{ProcessId=41006;Name='node.exe';ExecutablePath='C:\Tools\node.exe';CommandLine='node unrelated-server.js'}
  );$script:stopped=@();$script:taskStopped=$false
  function Get-CimInstance{param($ClassName,$ErrorAction);return @($script:mockProcesses)}
  function Stop-Process{param($Id,[switch]$Force,$ErrorAction);$script:stopped+=[int]$Id;$script:mockProcesses=@($script:mockProcesses|Where-Object{$_.ProcessId -ne [int]$Id})}
  function Stop-ScheduledTask{param($TaskName,$ErrorAction);$script:taskStopped=$TaskName -eq 'GRMetro Live Performance Center Supervisor'}
  $processState=Stop-GrMetroUpgradeProcesses $processInstall
  Assert ($processState.OperatorWasRunning -and $processState.RuntimeWasRunning) 'Upgrade process state did not preserve prior runtime state.'
  Assert (@($script:stopped|Sort-Object) -join ',' -eq '41001,41002,41003,41004') 'Upgrade quiesce stopped the wrong process set.'
  Assert ($script:taskStopped) 'Upgrade quiesce did not stop the GRMetro scheduled-task instance.'
  Assert ($script:stopped -notcontains 41005 -and $script:stopped -notcontains 41006) 'Upgrade quiesce stopped Edge or an unrelated Node process.'
  Remove-Item Function:\Get-CimInstance,Function:\Stop-Process,Function:\Stop-ScheduledTask -Force
  Write-Output 'PASS: upgrade quiesce stops only packaged GRMetro processes and preserves Edge.'

  $wizardAst=[Management.Automation.Language.Parser]::ParseFile((Join-Path $repository 'scripts/windows/env-wizard.ps1'),[ref]$tokens,[ref]$parseErrors)
  $choiceFunction=$wizardAst.Find({param($node) $node -is [Management.Automation.Language.FunctionDefinitionAst] -and $node.Name -eq 'Get-AutostartChoice'},$true)
  Invoke-Expression $choiceFunction.Extent.Text
  $firewallChoiceFunction=$wizardAst.Find({param($node) $node -is [Management.Automation.Language.FunctionDefinitionAst] -and $node.Name -eq 'Get-FirewallChoice'},$true)
  Invoke-Expression $firewallChoiceFunction.Extent.Text
  Assert ((Get-AutostartChoice $true) -eq 'yes') 'Checked autostart choice was not saved as yes.'
  Assert ((Get-AutostartChoice $false) -eq 'no') 'Unchecked autostart choice was not saved as no.'
  Assert ((Get-AutostartChoice $null) -eq 'no') 'Indeterminate autostart choice must default to no.'
  Assert ((Get-FirewallChoice $true) -eq 'yes') 'Checked firewall choice was not saved as yes.'
  Assert ((Get-FirewallChoice $false) -eq 'no') 'Unchecked firewall choice was not saved as no.'
  Write-Output 'PASS: autostart and firewall preferences preserve explicit checkbox state.'

  $setupSource=Get-Content -LiteralPath (Join-Path $repository 'scripts/windows/setup-performance-center.ps1') -Raw
  Assert ($setupSource -match 'Get-GrMetroNodePath') 'Target setup does not resolve the bundled runtime.'
  Assert ($setupSource -notmatch 'npm(?:\.cmd)?\s+(ci|install|run|test)') 'Target setup still invokes npm.'
  Assert ($setupSource -notmatch 'build-launcher-exe|csc\.exe') 'Target setup still compiles application files.'
  Write-Output 'PASS: target setup validates the portable payload without npm, builds, tests, or compilation.'

  $nativeUiAst=[Management.Automation.Language.Parser]::ParseFile((Join-Path $repository 'scripts/windows/native-operator-ui.ps1'),[ref]$tokens,[ref]$parseErrors)
  $utf8NodeFunction=$nativeUiAst.Find({param($node) $node -is [Management.Automation.Language.FunctionDefinitionAst] -and $node.Name -eq 'Invoke-GrMetroUtf8Node'},$true)
  Invoke-Expression $utf8NodeFunction.Extent.Text
  function Get-GrMetroNodePath { return (Get-Command node.exe -ErrorAction Stop).Source }
  $unicodeProbe=Join-Path $fixture 'spaced qr probe.js'
  Write-Fixture $unicodeProbe 'process.stdout.write("\u2584\u2588 QR");'
  $unicodeResult=Invoke-GrMetroUtf8Node -ScriptPath $unicodeProbe -Argument 'unused'
  $expectedUnicode=([string][char]0x2584)+([string][char]0x2588)+' QR'
  Assert ($unicodeResult -eq $expectedUnicode) 'Native QR capture corrupted UTF-8 block characters.'
  Write-Output 'PASS: native QR capture preserves UTF-8 blocks from a spaced script path.'

  $launcherAst=[Management.Automation.Language.Parser]::ParseFile((Join-Path $repository 'scripts/windows/performance-center-launcher-v2.ps1'),[ref]$tokens,[ref]$parseErrors)
  foreach($name in @('Set-DetailText','Set-TransientDetail')) {
    $function=$launcherAst.Find({param($node) $node -is [Management.Automation.Language.FunctionDefinitionAst] -and $node.Name -eq $name},$true)
    Invoke-Expression $function.Extent.Text
  }
  $script:detailVersions=@{};$script:detailResets=@{}
  $detail=[pscustomobject]@{Name='BackendDetail';Text='Restart backend only'}
  Set-TransientDetail $detail 'Done - Backend restarted and health check passed.' 'Restart backend only' 8
  Assert ($script:detailResets.BackendDetail.DefaultText -eq 'Restart backend only') 'Backend success did not retain its exact default helper text.'
  $null=Set-DetailText $detail 'Restart failed'
  Assert (-not $script:detailResets.ContainsKey('BackendDetail')) 'A newer error could be overwritten by an old success timer.'
  Assert ($detail.Text -eq 'Restart failed') 'Newer action detail was not preserved.'
  Write-Output 'PASS: transient native action feedback restores exact defaults without overwriting newer state.'

  # Execute the actual v2 launch functions against a harmless script in a spaced path.
  $root = $installed
  $probe = Join-Path $installed 'scripts/windows/child probe.ps1'
  Write-Fixture $probe @'
param([switch]$Probe, [switch]$SkipBuild)
[IO.File]::WriteAllText((Join-Path $PSScriptRoot 'receipt.txt'), "$Probe,$SkipBuild")
'@
  $tokens=$null; $parseErrors=$null
  $ast=[Management.Automation.Language.Parser]::ParseFile((Join-Path $repository 'scripts/windows/performance-center-launcher-v2.ps1'),[ref]$tokens,[ref]$parseErrors)
  foreach ($name in @('Run-HiddenWait','Start-Supervisor')) {
    $function=$ast.Find({param($node) $node -is [Management.Automation.Language.FunctionDefinitionAst] -and $node.Name -eq $name},$true)
    Invoke-Expression $function.Extent.Text
  }
  Assert ((Run-HiddenWait $probe @('-Probe')) -eq 0) 'Hidden worker failed in spaced installation path.'
  $receipt=Join-Path (Split-Path $probe) 'receipt.txt'
  Assert ((Get-Content -LiteralPath $receipt -Raw) -eq 'True,False') 'Hidden worker arguments changed.'
  # Wait for the asynchronous production launch so this test leaves no child process.
  function Start-Process { param($FilePath,$ArgumentList,$WorkingDirectory,$WindowStyle)
    $child=Microsoft.PowerShell.Management\Start-Process -FilePath $FilePath -ArgumentList $ArgumentList -WorkingDirectory $WorkingDirectory -WindowStyle $WindowStyle -Wait -PassThru
    Assert ($child.ExitCode -eq 0) 'Child process failed.'
  }
  function Test-Backend { return $false }
  $startScript=$probe
  Start-Supervisor
  Assert ((Get-Content -LiteralPath $receipt -Raw) -eq 'False,True') 'Supervisor path/arguments changed.'
  function Add-Activity {}
  function Update-Status {}
  $edgeScript=$probe
  $loginHandler=$ast.Find({param($node) $node -is [Management.Automation.Language.InvokeMemberExpressionAst] -and $node.Extent.Text.StartsWith('$login.Add_Click(')},$true)
  & $loginHandler.Arguments[0].ScriptBlock.GetScriptBlock()
  Assert ((Get-Content -LiteralPath $receipt -Raw) -eq 'False,False') 'Login worker path changed.'
  Write-Output 'PASS: hidden worker, supervisor and login script paths containing spaces.'
} finally {
  $cleanup=[IO.Path]::GetFullPath($fixture)
  $tempRoot=[IO.Path]::GetFullPath([IO.Path]::GetTempPath()).TrimEnd('\')
  if ([IO.Path]::GetDirectoryName($cleanup) -ne $tempRoot -or [IO.Path]::GetFileName($cleanup) -notlike 'grmetro validation *') { throw 'Unsafe fixture cleanup path.' }
  if (Test-Path -LiteralPath $cleanup) { Remove-Item -LiteralPath $cleanup -Recurse -Force }
}
