# Shared by the packager and installer. Loading this file performs no installation.
function Assert-GrMetroPackagePath([string]$RelativePath) {
  # Only application source, setup tests, and explicitly reviewed assets are eligible.
  # In particular, runtime data is NOT apps/backend/src/data (which is source code).
  $allowed = $RelativePath -cmatch '^(package(-lock)?\.json|\.env\.example|README\.md|AGENTS\.md|Build GRMetro Installer\.cmd|GRMetro Performance Center\.(cmd|exe)|apps/(backend|dashboard|remote)/package\.json|apps/dashboard/(index\.html|vite\.config\.js)|apps/(backend|dashboard)/(src|test)/.+\.(js|jsx|css|json)|apps/dashboard/dist/.+|shared/[^/]+\.(js|cjs|json)|scripts/[^/]+\.js|scripts/windows/[^/]+\.(ps1|cmd|json)|tests/[^/]+\.(js|ps1)|docs/[^/]+\.md|assets/branding/grmetro(-logo\.png|\.ico)|assets/references/dashboard-reference\.png|assets/qr/\.gitkeep|runtime/node/(node\.exe|LICENSE|VERSION)|node_modules/.+)$'
  if (-not $allowed -or $RelativePath -match '(^|/)(\.{1,2}|logs|coverage|browser-profile|edge-profile)(/|$)' -or
      $RelativePath -match '[\\:*?"<>|]' -or $RelativePath -match '[. ](/|$)' -or $RelativePath -match '(?i)(\.local\.|\.private\.|(^|/)(cookies|storage-state|auth-state|session)[^/]*\.json$)') {
    throw "Disallowed package path: $RelativePath"
  }
  if ($RelativePath -ne '.env.example' -and $RelativePath -match '(?i)(^|/)\.env(?:\.|$)') { throw "Disallowed package path: $RelativePath" }
}

function Get-GrMetroManifestFiles($Manifest) {
  if ($Manifest.version -notin @(1,2) -or -not $Manifest.files -or $Manifest.files -is [string]) { throw 'Invalid package manifest.' }
  $seen = @{}
  foreach ($relative in $Manifest.files) {
    if ($relative -isnot [string]) { throw 'Invalid package filename.' }
    Assert-GrMetroPackagePath $relative
    if ($seen.ContainsKey($relative)) { throw "Duplicate package path: $relative" }
    $seen[$relative] = $true
  }
  return @($Manifest.files)
}

function Get-GrMetroPackageFiles($Manifest) {
  $files = @(Get-GrMetroManifestFiles $Manifest)
  $seen = @{}; foreach ($relative in $files) { $seen[$relative] = $true }
  $required = @('package.json','apps/backend/src/index.js','scripts/windows/package-manifest.json','scripts/windows/package-files.ps1','scripts/windows/process-control.ps1','scripts/windows/launch-integration.ps1','scripts/windows/release-identity.ps1','scripts/windows/application-validation.ps1','scripts/windows/env-wizard.ps1','GRMetro Performance Center.exe')
  if ($Manifest.version -eq 1) { $required += 'package-lock.json' }
  if ($Manifest.version -eq 2) {
    $required += @('.env.example','scripts/windows/package-build.json','scripts/windows/runtime-versions.json','scripts/windows/runtime-paths.ps1','scripts/windows/servicetitan-profile.ps1','scripts/windows/manual-legacy-upgrade.ps1','scripts/windows/update-host-installation.ps1','scripts/validate-private-configuration.js','shared/technicianConfiguration.js','apps/dashboard/dist/index.html','runtime/node/node.exe','runtime/node/LICENSE','runtime/node/VERSION','node_modules/express/package.json','node_modules/playwright/package.json','node_modules/qrcode-terminal/package.json')
  }
  foreach ($requiredPath in $required) {
    if (-not $seen.ContainsKey($requiredPath)) { throw "Required package file missing: $requiredPath" }
  }
  return $files
}

function Write-GrMetroPortablePackageManifest([string]$StageRoot) {
  $stage = [IO.Path]::GetFullPath($StageRoot).TrimEnd('\')
  $manifestPath = Join-Path $stage 'scripts/windows/package-manifest.json'
  if (-not (Test-Path -LiteralPath $manifestPath -PathType Leaf)) { throw 'Staged package manifest is missing.' }
  $files = @(Get-ChildItem -LiteralPath $stage -Recurse -File -Force | ForEach-Object {
    if ($_.Attributes -band [IO.FileAttributes]::ReparsePoint) { throw "Portable package contains a reparse point: $($_.FullName)" }
    $full = [IO.Path]::GetFullPath($_.FullName)
    if (-not $full.StartsWith($stage + '\', [StringComparison]::OrdinalIgnoreCase)) { throw 'Portable package file escaped the staging root.' }
    $relative = $full.Substring($stage.Length + 1).Replace('\','/')
    Assert-GrMetroPackagePath $relative
    $relative
  } | Sort-Object -Unique)
  $manifestRelative = 'scripts/windows/package-manifest.json'
  if ($files -notcontains $manifestRelative) { throw 'Staged package manifest was not enumerated.' }
  $manifest = [ordered]@{ version = 2; files = $files }
  $null = Get-GrMetroPackageFiles ([pscustomobject]$manifest)
  [IO.File]::WriteAllText($manifestPath, (($manifest | ConvertTo-Json -Depth 4) + [Environment]::NewLine), (New-Object Text.UTF8Encoding $false))
  return [pscustomobject]$manifest
}

function Get-GrMetroPackageDestination([string]$Root, [string]$RelativePath) {
  Assert-GrMetroPackagePath $RelativePath
  $base = [IO.Path]::GetFullPath($Root).TrimEnd('\')
  $destination = [IO.Path]::GetFullPath((Join-Path $base $RelativePath))
  if (-not $destination.StartsWith($base + '\', [StringComparison]::OrdinalIgnoreCase)) { throw 'Package path escapes its root.' }
  # Never follow a junction/symlink into another installation or private data directory.
  $current = $destination
  while ($current) {
    if (Test-Path -LiteralPath $current) {
      if ((Get-Item -LiteralPath $current -Force).Attributes -band [IO.FileAttributes]::ReparsePoint) { throw "Package path contains a reparse point: $RelativePath" }
    }
    $current = [IO.Path]::GetDirectoryName($current)
  }
  return $destination
}

function Assert-GrMetroApplicationFileTarget([string]$Path, [string]$RelativePath) {
  if ((Test-Path -LiteralPath $Path) -and -not (Test-Path -LiteralPath $Path -PathType Leaf)) {
    throw "Application file path is occupied by a directory: $RelativePath"
  }
}

function Copy-GrMetroPackageFiles([string]$SourceRoot, [string]$StageRoot) {
  $manifest = Get-Content -LiteralPath (Join-Path $SourceRoot 'scripts/windows/package-manifest.json') -Raw | ConvertFrom-Json
  $files = @(Get-GrMetroPackageFiles $manifest)
  # Validate every source before copying anything. No recursive checkout discovery.
  foreach ($relative in $files) {
    $source = Get-GrMetroPackageDestination $SourceRoot $relative
    if (-not (Test-Path -LiteralPath $source -PathType Leaf)) { throw "Package source missing: $relative" }
  }
  foreach ($relative in $files) {
    $destination = Get-GrMetroPackageDestination $StageRoot $relative
    New-Item -ItemType Directory -Force -Path ([IO.Path]::GetDirectoryName($destination)) | Out-Null
    Copy-Item -LiteralPath (Join-Path $SourceRoot $relative) -Destination $destination -Force
  }
}

function Get-GrMetroUpgradeRoot([string]$InstallRoot) {
  $install = [IO.Path]::GetFullPath($InstallRoot).TrimEnd('\')
  if (-not [IO.Path]::GetFileName($install)) { throw 'Invalid installation root.' }
  return $install + '.upgrade-transaction'
}

function Test-GrMetroTransientUpgradeCleanupError($ErrorRecord) {
  $exception=$ErrorRecord.Exception
  if($exception -isnot [IO.IOException]){return $false}
  $win32Code=$exception.HResult -band 0xFFFF
  return $win32Code -eq 145 -or $exception.Message -match '(?i)directory is not empty|directory not empty'
}

function Remove-GrMetroUpgradeRoot([string]$InstallRoot,[int]$MaximumAttempts=12,[int]$DelayMilliseconds=250,[scriptblock]$RemovalAction=$null,[scriptblock]$DelayAction=$null) {
  $upgradeRoot = Get-GrMetroUpgradeRoot $InstallRoot
  if (-not (Test-Path -LiteralPath $upgradeRoot)) { return }
  $item = Get-Item -LiteralPath $upgradeRoot -Force
  if ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'Upgrade transaction path is a reparse point.' }
  $install = [IO.Path]::GetFullPath($InstallRoot).TrimEnd('\')
  if ([IO.Path]::GetDirectoryName($upgradeRoot) -ne [IO.Path]::GetDirectoryName($install) -or
      [IO.Path]::GetFileName($upgradeRoot) -ne ([IO.Path]::GetFileName($install) + '.upgrade-transaction')) {
    throw 'Unsafe upgrade transaction cleanup path.'
  }
  if($MaximumAttempts -lt 1 -or $MaximumAttempts -gt 40 -or $DelayMilliseconds -lt 0 -or $DelayMilliseconds -gt 2000){throw 'Invalid upgrade cleanup retry policy.'}
  $lastError=$null
  for($attempt=1;$attempt -le $MaximumAttempts;$attempt++){
    try{
      if($RemovalAction){& $RemovalAction $upgradeRoot $attempt}else{Remove-Item -LiteralPath $upgradeRoot -Recurse -Force -ErrorAction Stop}
    }catch{
      $lastError=$_
      # Recursive deletion can finish after Windows reports ERROR_DIR_NOT_EMPTY.
      if(-not(Test-Path -LiteralPath $upgradeRoot)){return}
      if(-not(Test-GrMetroTransientUpgradeCleanupError $_)){throw}
    }
    if(-not(Test-Path -LiteralPath $upgradeRoot)){return}
    if($attempt -lt $MaximumAttempts){if($DelayAction){& $DelayAction $DelayMilliseconds}else{Start-Sleep -Milliseconds $DelayMilliseconds}}
  }
  $detail=if($lastError){$lastError.Exception.Message}else{'The transaction directory remained after recursive deletion.'}
  throw "Verified GRMetro transaction cleanup did not finish after $MaximumAttempts attempts. The remaining transaction was preserved at $upgradeRoot. Last error: $detail"
}

function Write-GrMetroUpgradeJournal([string]$JournalPath, $Journal) {
  $temporary = $JournalPath + '.tmp'
  [IO.File]::WriteAllText($temporary, (($Journal | ConvertTo-Json -Depth 5) + [Environment]::NewLine), (New-Object Text.UTF8Encoding $false))
  Move-Item -LiteralPath $temporary -Destination $JournalPath -Force
}

function Complete-GrMetroUpgradeTransaction([string]$InstallRoot) {
  $install = [IO.Path]::GetFullPath($InstallRoot).TrimEnd('\')
  $upgradeRoot = Get-GrMetroUpgradeRoot $install
  $journalPath = Join-Path $upgradeRoot 'journal.json'
  if (-not (Test-Path -LiteralPath $journalPath -PathType Leaf)) { throw 'Pending upgrade journal is missing.' }
  $journal = Get-Content -LiteralPath $journalPath -Raw | ConvertFrom-Json
  $validState = ($journal.version -eq 1 -and $journal.status -eq 'prepared') -or ($journal.version -eq 2 -and $journal.status -eq 'applied')
  if (-not $validState -or [IO.Path]::GetFullPath([string]$journal.installRoot).TrimEnd('\') -ne $install) {
    throw 'Invalid pending upgrade transaction.'
  }
  $journal.status = 'completed'
  Write-GrMetroUpgradeJournal $journalPath $journal
  Remove-GrMetroUpgradeRoot $install
}

function Invoke-GrMetroPowerShellScript([string]$ScriptPath, [string]$WorkingDirectory, [string[]]$Arguments = @(), [switch]$Sta) {
  $script = [IO.Path]::GetFullPath($ScriptPath)
  $working = [IO.Path]::GetFullPath($WorkingDirectory)
  if (-not (Test-Path -LiteralPath $script -PathType Leaf)) { throw "Required PowerShell script is missing: $script" }
  if (-not (Test-Path -LiteralPath $working -PathType Container)) { throw "PowerShell working directory is missing: $working" }
  $parts = @()
  if ($Sta) { $parts += '-STA' }
  $parts += @('-NoProfile','-ExecutionPolicy','Bypass','-File',('"{0}"' -f $script.Replace('"','\"')))
  foreach ($argument in $Arguments) {
    $parts += if ($argument -match '^-[A-Za-z]') { $argument } else { '"{0}"' -f ([string]$argument).Replace('"','\"') }
  }
  $start = New-Object Diagnostics.ProcessStartInfo
  $start.FileName = (Get-Command powershell.exe -ErrorAction Stop).Source
  $start.Arguments = $parts -join ' '
  $start.WorkingDirectory = $working
  $start.UseShellExecute = $false
  $start.CreateNoWindow = $true
  $start.RedirectStandardOutput = $true
  $start.RedirectStandardError = $true
  $process = New-Object Diagnostics.Process
  $process.StartInfo = $start
  if (-not $process.Start()) { throw "Could not start PowerShell script: $script" }
  $stdoutTask = $process.StandardOutput.ReadToEndAsync()
  $stderrTask = $process.StandardError.ReadToEndAsync()
  $process.WaitForExit()
  return [pscustomobject]@{ ExitCode = $process.ExitCode; StdOut = $stdoutTask.Result; StdErr = $stderrTask.Result; ScriptPath = $script; WorkingDirectory = $working }
}

function Format-GrMetroScriptFailure($Result, [string]$Label) {
  $detail = @([string]$Result.StdErr, [string]$Result.StdOut) | Where-Object { $_ -and $_.Trim() } | ForEach-Object { $_.Trim() }
  if (-not $detail) { $detail = @('The script returned no diagnostic output.') }
  return "$Label failed (exit code $($Result.ExitCode)).`nScript: $($Result.ScriptPath)`nWorking directory: $($Result.WorkingDirectory)`n`n$($detail -join [Environment]::NewLine)"
}

function Remove-GrMetroEmptyApplicationDirectories([string]$InstallRoot, [string[]]$RelativePaths) {
  $install = [IO.Path]::GetFullPath($InstallRoot).TrimEnd('\')
  $directories = @($RelativePaths | ForEach-Object {
    $current = [IO.Path]::GetDirectoryName((Get-GrMetroPackageDestination $install $_))
    while ($current -and $current.StartsWith($install + '\', [StringComparison]::OrdinalIgnoreCase)) {
      $current
      $current = [IO.Path]::GetDirectoryName($current)
    }
  } | Sort-Object Length -Descending -Unique)
  foreach ($directory in $directories) {
    if ((Test-Path -LiteralPath $directory -PathType Container) -and
        @(Get-ChildItem -LiteralPath $directory -Force).Count -eq 0) {
      Remove-Item -LiteralPath $directory -Force
    }
  }
}

function Test-GrMetroFilesEqual([string]$LeftPath,[string]$RightPath) {
  if (-not (Test-Path -LiteralPath $LeftPath -PathType Leaf) -or -not (Test-Path -LiteralPath $RightPath -PathType Leaf)) { return $false }
  $left=Get-Item -LiteralPath $LeftPath -Force;$right=Get-Item -LiteralPath $RightPath -Force
  if ($left.Length -ne $right.Length) { return $false }
  return (Get-FileHash -LiteralPath $LeftPath -Algorithm SHA256).Hash -eq (Get-FileHash -LiteralPath $RightPath -Algorithm SHA256).Hash
}

function Test-GrMetroLegacyInterruptedRollbackCleanup([string]$InstallRoot,$Journal) {
  $install=[IO.Path]::GetFullPath($InstallRoot).TrimEnd('\')
  $upgradeRoot=Get-GrMetroUpgradeRoot $install
  $stageRoot=Join-Path $upgradeRoot 'stage';$backupRoot=Join-Path $upgradeRoot 'backup'
  if((Test-Path -LiteralPath $stageRoot) -or -not(Test-Path -LiteralPath $backupRoot -PathType Container)){return $false}
  if(@($Journal.files|Where-Object{-not [bool]$_.existed}).Count -ne 0){return $false}
  $manifestPath=Join-Path $install 'scripts/windows/package-manifest.json'
  if(-not(Test-Path -LiteralPath $manifestPath -PathType Leaf)){return $false}
  try{$manifest=Get-Content -LiteralPath $manifestPath -Raw|ConvertFrom-Json;$manifestFiles=@(Get-GrMetroManifestFiles $manifest)}catch{return $false}
  $journalSet=@{};foreach($record in @($Journal.files)){$relative=[string]$record.path;if($journalSet.ContainsKey($relative)){return $false};$journalSet[$relative]=$true}
  $manifestSet=@{};foreach($relative in $manifestFiles){$manifestSet[$relative]=$true}
  if($journalSet.Count -ne $manifestSet.Count){return $false}
  foreach($relative in $journalSet.Keys){if(-not$manifestSet.ContainsKey($relative)){return $false}}
  $missing=0;$surviving=0;$envBackupMissing=$false
  try{
    foreach($relative in $journalSet.Keys){
      $destination=Get-GrMetroPackageDestination $install $relative
      if(-not(Test-Path -LiteralPath $destination -PathType Leaf)){return $false}
      $backup=Get-GrMetroPackageDestination $backupRoot $relative
      if(Test-Path -LiteralPath $backup -PathType Leaf){if(-not(Test-GrMetroFilesEqual $destination $backup)){return $false};$surviving++}
      else{$missing++;if($relative -eq '.env.example'){$envBackupMissing=$true}}
    }
    foreach($item in @(Get-ChildItem -LiteralPath $backupRoot -Recurse -File -Force)){
      if($item.Attributes -band [IO.FileAttributes]::ReparsePoint){return $false}
      $relative=$item.FullName.Substring([IO.Path]::GetFullPath($backupRoot).TrimEnd('\').Length+1).Replace('\','/')
      if(-not$journalSet.ContainsKey($relative)){return $false}
    }
    $envExample=Get-GrMetroPackageDestination $install '.env.example'
    if(-not$envBackupMissing -or (Get-FileHash -LiteralPath $envExample -Algorithm SHA256).Hash -ne '8F30095242DEC41D1839340326382DA56D09259D0876838BBEB2CA1564B3006B'){return $false}
  }catch{return $false}
  return $missing -gt 0 -and $surviving -gt 0
}

function Get-GrMetroLegacyTransactionState([string]$InstallRoot,$Journal) {
  $install=[IO.Path]::GetFullPath($InstallRoot).TrimEnd('\')
  $upgradeRoot=Get-GrMetroUpgradeRoot $install
  $stageRoot=Join-Path $upgradeRoot 'stage';$backupRoot=Join-Path $upgradeRoot 'backup'
  $stageManifestPath=Join-Path $stageRoot 'scripts/windows/package-manifest.json'
  if (-not (Test-Path -LiteralPath $stageManifestPath -PathType Leaf)) {
    if(Test-GrMetroLegacyInterruptedRollbackCleanup $install $Journal){return 'prior-cleanup'}
    return 'unknown'
  }
  try {$stageManifest=Get-Content -LiteralPath $stageManifestPath -Raw|ConvertFrom-Json;$stageFiles=@(Get-GrMetroManifestFiles $stageManifest)}catch{return 'unknown'}
  $stageSet=@{};foreach($relative in $stageFiles){$stageSet[$relative]=$true}
  $matchesApplied=$true;$matchesPrior=$true
  foreach($record in @($Journal.files)) {
    $relative=[string]$record.path
    $destination=Get-GrMetroPackageDestination $install $relative
    if($stageSet.ContainsKey($relative)){
      $staged=Get-GrMetroPackageDestination $stageRoot $relative
      if(-not(Test-GrMetroFilesEqual $destination $staged)){$matchesApplied=$false}
    }elseif(Test-Path -LiteralPath $destination){$matchesApplied=$false}
    if([bool]$record.existed){
      $backup=Get-GrMetroPackageDestination $backupRoot $relative
      if(-not(Test-GrMetroFilesEqual $destination $backup)){$matchesPrior=$false}
    }elseif(Test-Path -LiteralPath $destination){$matchesPrior=$false}
    if(-not$matchesApplied -and -not$matchesPrior){break}
  }
  if($matchesApplied){return 'applied'}
  if($matchesPrior){return 'prior'}
  return 'partial'
}

function Get-GrMetroUpgradeRecoveryAction([string]$InstallRoot) {
  $install = [IO.Path]::GetFullPath($InstallRoot).TrimEnd('\')
  $upgradeRoot = Get-GrMetroUpgradeRoot $install
  if (-not (Test-Path -LiteralPath $upgradeRoot)) { return 'none' }
  if ((Get-Item -LiteralPath $upgradeRoot -Force).Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'Upgrade transaction path is a reparse point.' }
  $journalPath = Join-Path $upgradeRoot 'journal.json'
  if (-not (Test-Path -LiteralPath $journalPath -PathType Leaf)) { return 'cleanup' }
  $journal = Get-Content -LiteralPath $journalPath -Raw | ConvertFrom-Json
  if ($journal.version -notin @(1,2) -or [IO.Path]::GetFullPath([string]$journal.installRoot).TrimEnd('\') -ne $install) {
    throw 'Invalid upgrade recovery journal.'
  }
  if ($journal.status -eq 'completed') { return 'cleanup' }
  if($journal.version -eq 1 -and $journal.status -eq 'prepared'){
    $legacyState=Get-GrMetroLegacyTransactionState $install $journal
    if($legacyState -in @('applied','prior','prior-cleanup')){
      # Old journals never advanced beyond "prepared" while applying files. Only
      # retire one when the complete file evidence proves a stable application.
      return 'cleanup'
    }
  }
  if ($journal.version -eq 2 -and $journal.status -eq 'prepared') {
    # Version 2 journals distinguish a fully verified backup from the start of
    # mutation. Nothing in the installation changed while the state is prepared.
    return 'cleanup'
  }
  $recoverable = ($journal.version -eq 1 -and $journal.status -eq 'prepared') -or
    ($journal.version -eq 2 -and $journal.status -in @('applying','applied'))
  if (-not $recoverable -or -not $journal.files) { throw 'Invalid upgrade recovery state.' }
  Assert-GrMetroUpgradeRollbackSources $install $journal
  return 'rollback'
}

function Restore-GrMetroUpgradeTransaction([string]$InstallRoot) {
  $install = [IO.Path]::GetFullPath($InstallRoot).TrimEnd('\')
  $upgradeRoot = Get-GrMetroUpgradeRoot $install
  $action=Get-GrMetroUpgradeRecoveryAction $install
  if($action -eq 'none'){return $false}
  if($action -eq 'cleanup'){Remove-GrMetroUpgradeRoot $install;return $false}
  $journal=Get-Content -LiteralPath (Join-Path $upgradeRoot 'journal.json') -Raw|ConvertFrom-Json
  $backupRoot = Join-Path $upgradeRoot 'backup'
  foreach ($record in @($journal.files)) {
    $relative = [string]$record.path
    $destination = Get-GrMetroPackageDestination $install $relative
    Assert-GrMetroApplicationFileTarget $destination $relative
    if ([bool]$record.existed) {
      $backup = Get-GrMetroPackageDestination $backupRoot $relative
      New-Item -ItemType Directory -Force -Path ([IO.Path]::GetDirectoryName($destination)) | Out-Null
      Copy-Item -LiteralPath $backup -Destination $destination -Force
    } elseif (Test-Path -LiteralPath $destination -PathType Leaf) {
      Remove-Item -LiteralPath $destination -Force
    }
  }
  Remove-GrMetroEmptyApplicationDirectories $install @($journal.files | Where-Object { -not [bool]$_.existed } | ForEach-Object { [string]$_.path })
  Remove-GrMetroUpgradeRoot $install
  return $true
}

function Read-GrMetroInstalledPackageFiles([string]$InstallRoot) {
  $manifestPath = Join-Path $InstallRoot 'scripts/windows/package-manifest.json'
  if (-not (Test-Path -LiteralPath $manifestPath -PathType Leaf)) { return @() }
  $manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
  # An installed manifest is historical inventory. Validate its paths and shape,
  # but never apply the current release's required-file policy retroactively.
  return @(Get-GrMetroManifestFiles $manifest)
}

function Assert-GrMetroUpgradeRollbackSources([string]$InstallRoot,$Journal) {
  $install=[IO.Path]::GetFullPath($InstallRoot).TrimEnd('\')
  $backupRoot=Join-Path (Get-GrMetroUpgradeRoot $install) 'backup'
  foreach($record in @($Journal.files)){
    $relative=[string]$record.path
    $null=Get-GrMetroPackageDestination $install $relative
    if([bool]$record.existed){
      $backup=Get-GrMetroPackageDestination $backupRoot $relative
      if(-not(Test-Path -LiteralPath $backup -PathType Leaf)){throw "Upgrade backup missing: $relative"}
      if($Journal.version -eq 2){
        $expectedHash=([string]$record.backupSha256).ToUpperInvariant()
        if($expectedHash -notmatch '^[A-F0-9]{64}$'){throw "Invalid upgrade backup record: $relative"}
        if((Get-FileHash -LiteralPath $backup -Algorithm SHA256).Hash -ne $expectedHash){throw "Upgrade backup checksum mismatch: $relative"}
      }
    }
  }
}

function Test-GrMetroPackageArchive([string]$PackageZip,[string]$InstallRoot) {
  Add-Type -AssemblyName System.IO.Compression.FileSystem
  $install=[IO.Path]::GetFullPath($InstallRoot).TrimEnd('\');$archive=$null
  try{
    $archive=[IO.Compression.ZipFile]::OpenRead([IO.Path]::GetFullPath($PackageZip))
    $manifestEntry=$archive.GetEntry('scripts/windows/package-manifest.json');if(-not$manifestEntry){$manifestEntry=$archive.GetEntry('scripts\windows\package-manifest.json')}
    if(-not$manifestEntry){throw 'Package manifest is missing.'}
    $reader=New-Object IO.StreamReader($manifestEntry.Open());try{$manifest=$reader.ReadToEnd()|ConvertFrom-Json}finally{$reader.Dispose()}
    $files=@(Get-GrMetroPackageFiles $manifest);$expected=@{};foreach($relative in $files){$expected[$relative]=$true}
    $entries=@{};foreach($entry in $archive.Entries){$relative=$entry.FullName.Replace('\','/');Assert-GrMetroPackagePath $relative;if(-not$expected.ContainsKey($relative)-or$entries.ContainsKey($relative)){throw "Unexpected or duplicate package entry: $relative"};$null=Get-GrMetroPackageDestination $install $relative;$entries[$relative]=$true}
    foreach($relative in $files){if(-not$entries.ContainsKey($relative)){throw "Package entry missing: $relative"}}
    return [pscustomobject]@{Manifest=$manifest;Files=$files;EntryCount=$entries.Count}
  }finally{if($archive){$archive.Dispose()}}
}

function Prepare-GrMetroPackageTransaction([string]$PackageZip,[string]$InstallRoot,[switch]$RejectExistingTransaction) {
  Add-Type -AssemblyName System.IO.Compression.FileSystem
  $install = [IO.Path]::GetFullPath($InstallRoot).TrimEnd('\')
  if($RejectExistingTransaction){
    $recovery=Get-GrMetroUpgradeRecoveryAction $install
    if($recovery-ne'none'){throw "A pending GRMetro transaction requires $recovery and must be preserved before preparing another package."}
  }else{$null = Restore-GrMetroUpgradeTransaction $install}
  $upgradeRoot = Get-GrMetroUpgradeRoot $install
  New-Item -ItemType Directory -Force -Path $upgradeRoot | Out-Null
  $stageRoot = Join-Path $upgradeRoot 'stage'
  $backupRoot = Join-Path $upgradeRoot 'backup'
  New-Item -ItemType Directory -Force -Path $stageRoot,$backupRoot | Out-Null
  $archive = $null
  try {
    $archive = [IO.Compression.ZipFile]::OpenRead([IO.Path]::GetFullPath($PackageZip))
    $manifestEntry = $archive.GetEntry('scripts/windows/package-manifest.json')
    # .NET Framework on Windows can write ZIP entry names with backslashes.
    if (-not $manifestEntry) { $manifestEntry = $archive.GetEntry('scripts\windows\package-manifest.json') }
    if (-not $manifestEntry) { throw 'Package manifest is missing.' }
    $reader = New-Object IO.StreamReader($manifestEntry.Open())
    try { $manifest = $reader.ReadToEnd() | ConvertFrom-Json } finally { $reader.Dispose() }
    $files = @(Get-GrMetroPackageFiles $manifest)
    $expected = @{}; foreach ($relative in $files) { $expected[$relative] = $true }
    $entries = @{}
    # Validate the complete archive and every source/destination before mutation.
    foreach ($entry in $archive.Entries) {
      $relative = $entry.FullName.Replace('\', '/')
      Assert-GrMetroPackagePath $relative
      if (-not $expected.ContainsKey($relative) -or $entries.ContainsKey($relative)) { throw "Unexpected or duplicate package entry: $relative" }
      $null = Get-GrMetroPackageDestination $install $relative
      $null = Get-GrMetroPackageDestination $stageRoot $relative
      $entries[$relative] = $entry
    }
    foreach ($relative in $files) { if (-not $entries.ContainsKey($relative)) { throw "Package entry missing: $relative" } }

    # Extract a complete replacement tree before backing up or changing the installation.
    foreach ($relative in $files) {
      $destination = Get-GrMetroPackageDestination $stageRoot $relative
      New-Item -ItemType Directory -Force -Path ([IO.Path]::GetDirectoryName($destination)) | Out-Null
      [IO.Compression.ZipFileExtensions]::ExtractToFile($entries[$relative], $destination, $false)
    }
    $archive.Dispose(); $archive = $null

    $oldFiles = @(Read-GrMetroInstalledPackageFiles $install)
    $affected = @($files + $oldFiles | Sort-Object -Unique)
    $records = @()
    foreach ($relative in $affected) {
      $destination = Get-GrMetroPackageDestination $install $relative
      Assert-GrMetroApplicationFileTarget $destination $relative
      $existed = Test-Path -LiteralPath $destination -PathType Leaf
      $backupHash = $null
      if ($existed) {
        $backup = Get-GrMetroPackageDestination $backupRoot $relative
        New-Item -ItemType Directory -Force -Path ([IO.Path]::GetDirectoryName($backup)) | Out-Null
        Copy-Item -LiteralPath $destination -Destination $backup -Force
        $sourceHash = (Get-FileHash -LiteralPath $destination -Algorithm SHA256).Hash
        $backupHash = (Get-FileHash -LiteralPath $backup -Algorithm SHA256).Hash
        if ($backupHash -ne $sourceHash) { throw "Upgrade backup verification failed: $relative" }
      }
      $records += [ordered]@{ path = $relative; existed = [bool]$existed; backupSha256 = $(if($existed){$backupHash}else{$null}) }
    }

    # Publishing this journal is the commit boundary. Any later interruption is
    # recovered on the next installer run; ordinary failures roll back immediately.
    $journalPath = Join-Path $upgradeRoot 'journal.json'
    $journal = [ordered]@{ version = 2; status = 'prepared'; installRoot = $install; files = $records }
    Write-GrMetroUpgradeJournal $journalPath $journal

    return [pscustomobject]@{InstallRoot=$install;UpgradeRoot=$upgradeRoot;JournalPath=$journalPath;Status='prepared';PackageFiles=$files;AffectedFiles=$affected}
  } catch {
    if ($archive) { $archive.Dispose(); $archive = $null }
    if (Test-Path -LiteralPath $upgradeRoot) {
      $journalPath = Join-Path $upgradeRoot 'journal.json'
      if (-not (Test-Path -LiteralPath $journalPath)) { Remove-GrMetroUpgradeRoot $install }
    }
    throw
  } finally {
    if ($archive) { $archive.Dispose() }
  }
}

function Apply-GrMetroPreparedPackageTransaction([string]$InstallRoot,[scriptblock]$FailureInjector=$null) {
  $install=[IO.Path]::GetFullPath($InstallRoot).TrimEnd('\')
  $upgradeRoot=Get-GrMetroUpgradeRoot $install
  $journalPath=Join-Path $upgradeRoot 'journal.json'
  $stageRoot=Join-Path $upgradeRoot 'stage'
  if(-not(Test-Path -LiteralPath $journalPath -PathType Leaf)){throw 'Prepared upgrade journal is missing.'}
  $journal=Get-Content -LiteralPath $journalPath -Raw|ConvertFrom-Json
  if($journal.version -ne 2 -or $journal.status -ne 'prepared' -or [IO.Path]::GetFullPath([string]$journal.installRoot).TrimEnd('\') -ne $install){throw 'Invalid prepared upgrade transaction.'}
  $stageManifestPath=Join-Path $stageRoot 'scripts\windows\package-manifest.json'
  if(-not(Test-Path -LiteralPath $stageManifestPath -PathType Leaf)){throw 'Prepared package manifest is missing.'}
  $manifest=Get-Content -LiteralPath $stageManifestPath -Raw|ConvertFrom-Json
  $files=@(Get-GrMetroPackageFiles $manifest)
  $expected=@{};foreach($relative in $files){$expected[$relative]=$true;$source=Get-GrMetroPackageDestination $stageRoot $relative;if(-not(Test-Path -LiteralPath $source -PathType Leaf)){throw "Prepared package file missing: $relative"}}
  Assert-GrMetroUpgradeRollbackSources $install $journal
  $oldFiles=@(Read-GrMetroInstalledPackageFiles $install)
  try{
    $journal.status='applying';Write-GrMetroUpgradeJournal $journalPath $journal
    foreach($relative in $files){
      $source=Get-GrMetroPackageDestination $stageRoot $relative
      $destination=Get-GrMetroPackageDestination $install $relative
      Assert-GrMetroApplicationFileTarget $destination $relative
      New-Item -ItemType Directory -Force -Path ([IO.Path]::GetDirectoryName($destination))|Out-Null
      Copy-Item -LiteralPath $source -Destination $destination -Force
      if($FailureInjector){& $FailureInjector 'replace' $relative}
    }
    $obsolete=@($oldFiles|Where-Object{-not$expected.ContainsKey($_)})
    foreach($relative in $obsolete){
      $destination=Get-GrMetroPackageDestination $install $relative
      Assert-GrMetroApplicationFileTarget $destination $relative
      if(Test-Path -LiteralPath $destination -PathType Leaf){Remove-Item -LiteralPath $destination -Force}
      if($FailureInjector){& $FailureInjector 'remove-obsolete' $relative}
    }
    Remove-GrMetroEmptyApplicationDirectories $install $obsolete
    $journal.status='applied';Write-GrMetroUpgradeJournal $journalPath $journal
    return [pscustomobject]@{InstallRoot=$install;UpgradeRoot=$upgradeRoot;JournalPath=$journalPath;Status='applied';PackageFiles=$files;ObsoleteFiles=$obsolete}
  }catch{
    $failure=$_
    try{$null=Restore-GrMetroUpgradeTransaction $install}catch{throw "Upgrade failed: $($failure.Exception.Message). Automatic rollback also failed: $($_.Exception.Message)"}
    throw $failure
  }
}

function Install-GrMetroPackageFiles([string]$PackageZip,[string]$InstallRoot,[scriptblock]$FailureInjector=$null,[switch]$DeferCommitCleanup) {
  $null=Prepare-GrMetroPackageTransaction -PackageZip $PackageZip -InstallRoot $InstallRoot
  $null=Apply-GrMetroPreparedPackageTransaction -InstallRoot $InstallRoot -FailureInjector $FailureInjector
  if(-not$DeferCommitCleanup){Complete-GrMetroUpgradeTransaction $InstallRoot}
  # Every non-manifest file remains in place: .env, both data directories,
  # private configuration, logs, browser profiles and operator choices.
}
