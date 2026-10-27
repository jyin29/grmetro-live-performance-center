$ErrorActionPreference='Stop'
Set-StrictMode -Version Latest
$version='__VERSION__'
$legacyCommit='__LEGACY_COMMIT__'
$expectedReview='__REVIEW_SHA256__'
$expectedApp='__APPLICATION_SHA256__'
$expectedHost='__HOST_SHA256__'
$root=Join-Path $env:LOCALAPPDATA 'GRMetro\Performance Center'
$review=Join-Path $PSScriptRoot 'review.zip'
$work=Join-Path $PSScriptRoot 'review-extracted'
try {
  Write-Host 'GRMetro legacy upgrade - AUTHORIZED INTERNAL BUILD' -ForegroundColor Cyan
  Write-Host "Target: legacy commit $legacyCommit -> $version (testing)"
  Write-Host 'This package is unsigned and requires explicit internal approval plus a clean Defender scan.' -ForegroundColor Yellow
  if((Get-FileHash -LiteralPath $review -Algorithm SHA256).Hash-ne$expectedReview){throw 'Embedded review ZIP hash mismatch.'}
  Add-Type -AssemblyName System.IO.Compression.FileSystem
  $archive=[IO.Compression.ZipFile]::OpenRead($review)
  try{
    $expected=@('payload/dashboard.zip','payload/update-host-migration.zip','README.txt','SHA256SUMS.txt','scripts/windows/application-validation.ps1','scripts/windows/install-update-host.ps1','scripts/windows/launch-integration.ps1','scripts/windows/legacy-composite-upgrade.ps1','scripts/windows/manual-legacy-upgrade.ps1','scripts/windows/package-files.ps1','scripts/windows/process-control.ps1','scripts/windows/release-feed.ps1','scripts/windows/release-identity.ps1','scripts/windows/update-host-installation.ps1')
    $entries=@{};foreach($entry in $archive.Entries){$relative=$entry.FullName.Replace('\','/');if([string]::IsNullOrWhiteSpace($entry.Name)-or$relative-notin$expected-or$entries.ContainsKey($relative)){throw "Unexpected or duplicate review entry: $relative"};$entries[$relative]=$entry}
    foreach($relative in $expected){if(-not$entries.ContainsKey($relative)){throw "Missing review entry: $relative"};$destination=[IO.Path]::GetFullPath((Join-Path $work $relative));$base=[IO.Path]::GetFullPath($work).TrimEnd('\');if(-not$destination.StartsWith($base+'\',[StringComparison]::OrdinalIgnoreCase)){throw 'Review entry escaped its extraction root.'};New-Item -ItemType Directory -Force -Path ([IO.Path]::GetDirectoryName($destination))|Out-Null;[IO.Compression.ZipFileExtensions]::ExtractToFile($entries[$relative],$destination,$false)}
  }finally{$archive.Dispose()}
  $sums=Join-Path $work 'SHA256SUMS.txt';foreach($line in @(Get-Content -LiteralPath $sums)){if($line-notmatch'^([A-Fa-f0-9]{64})  (.+)$'){throw 'Malformed embedded checksum line.'};$hash=$matches[1].ToUpperInvariant();$relative=$matches[2].Replace('\','/');$path=[IO.Path]::GetFullPath((Join-Path $work $relative));if(-not$path.StartsWith(([IO.Path]::GetFullPath($work).TrimEnd('\')+'\'),[StringComparison]::OrdinalIgnoreCase)){throw 'Unsafe embedded path.'};if(-not(Test-Path -LiteralPath $path -PathType Leaf)-or(Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash-ne$hash){throw "Embedded checksum mismatch: $relative"}}
  $app=Join-Path $work 'payload\dashboard.zip';$hostBundle=Join-Path $work 'payload\update-host-migration.zip';$scripts=Join-Path $work 'scripts\windows'
  if((Get-FileHash -LiteralPath $app -Algorithm SHA256).Hash-ne$expectedApp){throw 'Dashboard ZIP hash mismatch.'};if((Get-FileHash -LiteralPath $hostBundle -Algorithm SHA256).Hash-ne$expectedHost){throw 'Update Host ZIP hash mismatch.'}
  $identityPath=Join-Path $root 'scripts\windows\package-build.json';$manifestPath=Join-Path $root 'scripts\windows\package-manifest.json'
  if(-not(Test-Path -LiteralPath $identityPath -PathType Leaf)-or-not(Test-Path -LiteralPath $manifestPath -PathType Leaf)){throw 'Legacy installation metadata is missing.'}
  $id=Get-Content -LiteralPath $identityPath -Raw|ConvertFrom-Json;$manifest=Get-Content -LiteralPath $manifestPath -Raw|ConvertFrom-Json
  if($null-eq$id.PSObject.Properties['applicationVersion']-or[string]$id.applicationVersion-ne'1.0.0'-or[string]$id.commit-ne$legacyCommit-or[int]$manifest.version-ne2){throw 'Unsupported production baseline. No changes made.'}
  Write-Host 'Running application, private-configuration, Update Host, and signed-feed preflight...'
  $preflight=& (Join-Path $scripts 'legacy-composite-upgrade.ps1') -PackageZip $app -ExpectedPackageSha256 $expectedApp -ExpectedReleaseVersion $version -ExpectedInstalledCommit $legacyCommit -UpdateHostBundle $hostBundle -ExpectedUpdateHostSha256 $expectedHost -ValidateOnly -ConfirmUnsignedInternalHost
  if([string]$preflight.Status-ne'validated'){throw 'Composite preflight did not return a validated result.'}
  Write-Host 'PASS: all checks completed without changing the installation.' -ForegroundColor Green
  $choice=Read-Host 'Type INSTALL to create a verified rollback bundle and begin the maintenance upgrade (anything else exits)';if($choice-cne'INSTALL'){Write-Host 'Cancelled. No installed files changed.';exit 0}
  $defender=Read-Host 'Confirm Microsoft Defender reported no detection for this exact file: type REVIEWED';if($defender-cne'REVIEWED'){throw 'Defender review not confirmed. No changes made.'}
  $backup=Join-Path $env:LOCALAPPDATA ('GRMetro\Legacy Upgrade Backups\before-'+$version+'-'+[DateTime]::UtcNow.ToString('yyyyMMddTHHmmssZ'));if(Test-Path -LiteralPath $backup){throw 'Backup destination already exists.'}
  $backupParent=[IO.Path]::GetDirectoryName($backup);$current=$backupParent;while($current){if(Test-Path $current){if((Get-Item $current -Force).Attributes-band[IO.FileAttributes]::ReparsePoint){throw 'Rollback backup path contains a reparse point.'}};$current=[IO.Path]::GetDirectoryName($current)}
  $files=@($manifest.files);$total=[long]0;foreach($relative in $files){$source=[IO.Path]::GetFullPath((Join-Path $root ([string]$relative)));if(-not$source.StartsWith(([IO.Path]::GetFullPath($root).TrimEnd('\')+'\'),[StringComparison]::OrdinalIgnoreCase)-or-not(Test-Path $source -PathType Leaf)){throw "Installed managed file is missing or unsafe: $relative"};if((Get-Item $source -Force).Attributes-band[IO.FileAttributes]::ReparsePoint){throw "Managed file is a reparse point: $relative"};$total+=(Get-Item $source).Length}
  $disk=New-Object IO.DriveInfo ([IO.Path]::GetPathRoot($backup));if($disk.AvailableFreeSpace-lt($total*2+1073741824)){throw 'Insufficient free space for the independent rollback bundle and upgrade.'}
  Write-Host 'Copying and verifying the independent managed-file rollback bundle...';$applicationBackup=Join-Path $backup 'application';New-Item -ItemType Directory -Force -Path $applicationBackup|Out-Null;$inventory=@()
  foreach($relative in $files){$source=Join-Path $root ([string]$relative);$destination=Join-Path $applicationBackup ([string]$relative);New-Item -ItemType Directory -Force -Path ([IO.Path]::GetDirectoryName($destination))|Out-Null;Copy-Item -LiteralPath $source -Destination $destination; $sourceHash=(Get-FileHash $source -Algorithm SHA256).Hash;$backupHash=(Get-FileHash $destination -Algorithm SHA256).Hash;if($sourceHash-ne$backupHash){throw "Rollback backup verification failed: $relative"};$inventory+=[ordered]@{path=[string]$relative;sha256=$sourceHash;bytes=(Get-Item $source).Length}}
  [IO.File]::WriteAllText((Join-Path $backup 'SHA256-INVENTORY.json'),((([ordered]@{schemaVersion=1;applicationVersion='1.0.0';commit=$legacyCommit;files=$inventory}|ConvertTo-Json -Depth 5))+[Environment]::NewLine),(New-Object Text.UTF8Encoding($false)))
  Write-Host "Independent rollback bundle verified: $backup" -ForegroundColor Green
  Write-Host 'Starting the composite dashboard and Update Host upgrade...' -ForegroundColor Yellow
  $result=& (Join-Path $scripts 'legacy-composite-upgrade.ps1') -PackageZip $app -ExpectedPackageSha256 $expectedApp -ExpectedReleaseVersion $version -ExpectedInstalledCommit $legacyCommit -UpdateHostBundle $hostBundle -ExpectedUpdateHostSha256 $expectedHost -ConfirmDefenderReview -ConfirmRollbackSource -ConfirmUnsignedInternalHost
  if([string]$result.Status-notin@('complete','complete-cleanup-required')){throw 'Composite upgrade did not report completion.'}
  Write-Host "SUCCESS: Dashboard $version and the Update Host are installed." -ForegroundColor Green;Write-Host "Independent rollback bundle: $backup";if($result.HostCleanupWarning){Write-Host ('Cleanup warning: '+$result.HostCleanupWarning) -ForegroundColor Yellow};Write-Host 'Open Control Center and click Check for Updates.'
}catch{Write-Host ('ERROR: '+$_.Exception.Message) -ForegroundColor Red;Write-Host 'Do not rerun. Preserve any transaction, Update Host.previous, manual evidence, and rollback bundle for review.' -ForegroundColor Yellow;exit 1}
