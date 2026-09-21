# Shared by the packager and installer. Loading this file performs no installation.
function Assert-GrMetroPackagePath([string]$RelativePath) {
  # Only application source, setup tests, and explicitly reviewed assets are eligible.
  # In particular, runtime data is NOT apps/backend/src/data (which is source code).
  $allowed = $RelativePath -cmatch '^(package(-lock)?\.json|\.env\.example|README\.md|AGENTS\.md|Build GRMetro Installer\.cmd|GRMetro Performance Center\.(cmd|exe)|apps/(backend|dashboard|remote)/package\.json|apps/dashboard/(index\.html|vite\.config\.js)|apps/(backend|dashboard)/(src|test)/.+\.(js|jsx|css|json)|shared/[^/]+\.(js|json)|scripts/[^/]+\.js|scripts/windows/[^/]+\.(ps1|cmd|json)|tests/[^/]+\.(js|ps1)|docs/[^/]+\.md|assets/branding/grmetro(-logo\.png|\.ico)|assets/references/dashboard-reference\.png|assets/qr/\.gitkeep)$'
  if (-not $allowed -or $RelativePath -match '(^|/)(\.{1,2}|node_modules|dist|logs|coverage|browser-profile|edge-profile)(/|$)' -or
      $RelativePath -match '[\\:*?"<>|]' -or $RelativePath -match '[. ](/|$)' -or $RelativePath -match '(?i)(\.local\.|\.private\.|(^|/)(cookies|storage-state|auth-state|session)[^/]*\.json$)') {
    throw "Disallowed package path: $RelativePath"
  }
}

function Get-GrMetroPackageFiles($Manifest) {
  if ($Manifest.version -ne 1 -or -not $Manifest.files -or $Manifest.files -is [string]) { throw 'Invalid package manifest.' }
  $seen = @{}
  foreach ($relative in $Manifest.files) {
    if ($relative -isnot [string]) { throw 'Invalid package filename.' }
    Assert-GrMetroPackagePath $relative
    if ($seen.ContainsKey($relative)) { throw "Duplicate package path: $relative" }
    $seen[$relative] = $true
  }
  foreach ($required in @('package.json','package-lock.json','.env.example','apps/backend/src/index.js','scripts/windows/package-manifest.json','scripts/windows/package-files.ps1','scripts/windows/env-wizard.ps1','GRMetro Performance Center.exe')) {
    if (-not $seen.ContainsKey($required)) { throw "Required package file missing: $required" }
  }
  return @($Manifest.files)
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
  # Validate every source before copying anything. No recursive folder copy or Git discovery.
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

function Remove-GrMetroUpgradeRoot([string]$InstallRoot) {
  $upgradeRoot = Get-GrMetroUpgradeRoot $InstallRoot
  if (-not (Test-Path -LiteralPath $upgradeRoot)) { return }
  $item = Get-Item -LiteralPath $upgradeRoot -Force
  if ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'Upgrade transaction path is a reparse point.' }
  $install = [IO.Path]::GetFullPath($InstallRoot).TrimEnd('\')
  if ([IO.Path]::GetDirectoryName($upgradeRoot) -ne [IO.Path]::GetDirectoryName($install) -or
      [IO.Path]::GetFileName($upgradeRoot) -ne ([IO.Path]::GetFileName($install) + '.upgrade-transaction')) {
    throw 'Unsafe upgrade transaction cleanup path.'
  }
  Remove-Item -LiteralPath $upgradeRoot -Recurse -Force
}

function Write-GrMetroUpgradeJournal([string]$JournalPath, $Journal) {
  $temporary = $JournalPath + '.tmp'
  [IO.File]::WriteAllText($temporary, (($Journal | ConvertTo-Json -Depth 5) + [Environment]::NewLine), (New-Object Text.UTF8Encoding $false))
  Move-Item -LiteralPath $temporary -Destination $JournalPath -Force
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

function Restore-GrMetroUpgradeTransaction([string]$InstallRoot) {
  $install = [IO.Path]::GetFullPath($InstallRoot).TrimEnd('\')
  $upgradeRoot = Get-GrMetroUpgradeRoot $install
  if (-not (Test-Path -LiteralPath $upgradeRoot)) { return $false }
  if ((Get-Item -LiteralPath $upgradeRoot -Force).Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'Upgrade transaction path is a reparse point.' }
  $journalPath = Join-Path $upgradeRoot 'journal.json'
  if (-not (Test-Path -LiteralPath $journalPath -PathType Leaf)) {
    # Mutation never begins until a complete journal is atomically published.
    Remove-GrMetroUpgradeRoot $install
    return $false
  }
  $journal = Get-Content -LiteralPath $journalPath -Raw | ConvertFrom-Json
  if ($journal.version -ne 1 -or [IO.Path]::GetFullPath([string]$journal.installRoot).TrimEnd('\') -ne $install) {
    throw 'Invalid upgrade recovery journal.'
  }
  if ($journal.status -eq 'completed') {
    Remove-GrMetroUpgradeRoot $install
    return $false
  }
  if ($journal.status -ne 'prepared' -or -not $journal.files) { throw 'Invalid upgrade recovery state.' }
  $backupRoot = Join-Path $upgradeRoot 'backup'
  foreach ($record in @($journal.files)) {
    $relative = [string]$record.path
    $destination = Get-GrMetroPackageDestination $install $relative
    Assert-GrMetroApplicationFileTarget $destination $relative
    if ([bool]$record.existed) {
      $backup = Get-GrMetroPackageDestination $backupRoot $relative
      if (-not (Test-Path -LiteralPath $backup -PathType Leaf)) { throw "Upgrade backup missing: $relative" }
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
  return @(Get-GrMetroPackageFiles $manifest)
}

function Install-GrMetroPackageFiles([string]$PackageZip, [string]$InstallRoot, [scriptblock]$FailureInjector = $null) {
  Add-Type -AssemblyName System.IO.Compression.FileSystem
  $install = [IO.Path]::GetFullPath($InstallRoot).TrimEnd('\')
  $null = Restore-GrMetroUpgradeTransaction $install
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
      if ($existed) {
        $backup = Get-GrMetroPackageDestination $backupRoot $relative
        New-Item -ItemType Directory -Force -Path ([IO.Path]::GetDirectoryName($backup)) | Out-Null
        Copy-Item -LiteralPath $destination -Destination $backup -Force
      }
      $records += [ordered]@{ path = $relative; existed = [bool]$existed }
    }

    # Publishing this journal is the commit boundary. Any later interruption is
    # recovered on the next installer run; ordinary failures roll back immediately.
    $journalPath = Join-Path $upgradeRoot 'journal.json'
    $journal = [ordered]@{ version = 1; status = 'prepared'; installRoot = $install; files = $records }
    Write-GrMetroUpgradeJournal $journalPath $journal

    try {
      foreach ($relative in $files) {
        $source = Get-GrMetroPackageDestination $stageRoot $relative
        $destination = Get-GrMetroPackageDestination $install $relative
        Assert-GrMetroApplicationFileTarget $destination $relative
        New-Item -ItemType Directory -Force -Path ([IO.Path]::GetDirectoryName($destination)) | Out-Null
        # The complete source is already staged and the previous destination is
        # backed up. A torn copy is restored by this run or by journal recovery.
        Copy-Item -LiteralPath $source -Destination $destination -Force
        if ($FailureInjector) { & $FailureInjector 'replace' $relative }
      }
      $obsolete = @($oldFiles | Where-Object { -not $expected.ContainsKey($_) })
      foreach ($relative in $obsolete) {
        $destination = Get-GrMetroPackageDestination $install $relative
        Assert-GrMetroApplicationFileTarget $destination $relative
        if (Test-Path -LiteralPath $destination -PathType Leaf) { Remove-Item -LiteralPath $destination -Force }
        if ($FailureInjector) { & $FailureInjector 'remove-obsolete' $relative }
      }
      Remove-GrMetroEmptyApplicationDirectories $install $obsolete
      $journal.status = 'completed'
      Write-GrMetroUpgradeJournal $journalPath $journal
    } catch {
      $failure = $_
      try { $null = Restore-GrMetroUpgradeTransaction $install } catch { throw "Upgrade failed and rollback could not complete: $($_.Exception.Message). Original failure: $($failure.Exception.Message)" }
      throw $failure
    }
    Remove-GrMetroUpgradeRoot $install
    # Every non-manifest file remains in place: .env, both data directories,
    # private configuration, logs, profiles, dependencies and autostart choice.
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
