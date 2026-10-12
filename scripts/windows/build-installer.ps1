param(
  [string]$ReleaseVersion='0.0.0.0',[ValidateSet('development','testing','stable')][string]$Channel='development',[int]$UpdaterProtocol=1,
  [string]$ReleaseSourceConfigPath,[string]$ReleasePublicKeysPath,[switch]$ProvisionReleaseTrust,
  [string]$SignToolPath,[string]$CertificateThumbprint,[string]$TimestampUrl,[switch]$RequireAuthenticode
)
$ErrorActionPreference="Stop"
$root=(Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
Set-Location $root
. (Join-Path $PSScriptRoot 'package-files.ps1')
. (Join-Path $PSScriptRoot 'release-identity.ps1')
. (Join-Path $PSScriptRoot 'release-feed.ps1')
. (Join-Path $PSScriptRoot 'authenticode-signing.ps1')

& powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot "build-launcher-exe.ps1")
if($LASTEXITCODE -ne 0){throw "Could not build launcher EXE."}
$launcherExe=Join-Path $root 'GRMetro Performance Center.exe'
$null=Invoke-GrMetroAuthenticodeSigning -Files @($launcherExe) -SignToolPath $SignToolPath -CertificateThumbprint $CertificateThumbprint -TimestampUrl $TimestampUrl -RequireAuthenticode:$RequireAuthenticode
$updateHostOut=Join-Path $root 'dist\windows-update-host'
if(Test-Path -LiteralPath $updateHostOut){Remove-Item -LiteralPath $updateHostOut -Recurse -Force}
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot 'build-update-host.ps1') -OutputDirectory $updateHostOut
if($LASTEXITCODE -ne 0){throw 'Could not build the stable GRMetro Update Host.'}
$updateHostExe=Join-Path $updateHostOut 'GRMetro Update Host.exe'
$null=Invoke-GrMetroAuthenticodeSigning -Files @($updateHostExe) -SignToolPath $SignToolPath -CertificateThumbprint $CertificateThumbprint -TimestampUrl $TimestampUrl -RequireAuthenticode:$RequireAuthenticode

if($ProvisionReleaseTrust){
  if(-not$ReleaseSourceConfigPath-or-not$ReleasePublicKeysPath){throw 'Explicit release-source and public-key files are required when provisioning production update trust.'}
  $source=Read-GrMetroReleaseSource $ReleaseSourceConfigPath;if(-not$source.Enabled){throw 'Provisioned production release source must be enabled.'}
  $keys=Get-GrMetroPinnedReleaseKeys $ReleasePublicKeysPath;if($keys.Count-lt1){throw 'Provisioned production public-key set must not be empty.'}
  Assert-GrMetroProvisionedKeyFingerprints $ReleasePublicKeysPath
  Copy-Item -LiteralPath $ReleaseSourceConfigPath -Destination (Join-Path $updateHostOut 'release-source.default.json') -Force
  Copy-Item -LiteralPath $ReleasePublicKeysPath -Destination (Join-Path $updateHostOut 'release-public-keys.json') -Force
}
$provisioning=[ordered]@{schemaVersion=1;applyOnSetup=[bool]$ProvisionReleaseTrust;updaterProtocol=$UpdaterProtocol}
[IO.File]::WriteAllText((Join-Path $updateHostOut 'provisioning-policy.json'),(($provisioning|ConvertTo-Json -Compress)+[Environment]::NewLine),(New-Object Text.UTF8Encoding $false))

$out=Join-Path $root "dist\windows-installer"
New-Item -ItemType Directory -Force -Path $out|Out-Null
$unsignedMarker=Join-Path $out 'NOT-PRODUCTION-READY-UNSIGNED.txt'
if($CertificateThumbprint){Remove-Item -LiteralPath $unsignedMarker -Force -ErrorAction SilentlyContinue}else{[IO.File]::WriteAllText($unsignedMarker,"This Windows build is unsigned and must not be deployed as a production release.`r`n",(New-Object Text.UTF8Encoding $false));Write-Warning 'Building unsigned Windows development/migration artifacts. They are NOT PRODUCTION READY.'}
$stage=Join-Path $env:TEMP ("grmetro-package-"+[guid]::NewGuid().ToString())
New-Item -ItemType Directory -Force -Path $stage|Out-Null

try {
  Copy-GrMetroPackageFiles -SourceRoot $root -StageRoot $stage
  # Public release artifacts use deployment-safe fallbacks. The backend loads the
  # destination machine's private .env before importing shared technician modules.
  Copy-Item -LiteralPath (Join-Path $stage 'scripts\deployment-technicians.js') -Destination (Join-Path $stage 'shared\technicians.js') -Force
  Copy-Item -LiteralPath (Join-Path $stage 'scripts\deployment-goals.js') -Destination (Join-Path $stage 'shared\goals.js') -Force

  # Build and resolve dependencies in the disposable package tree. Nothing from the
  # repository's development node_modules directory is copied into the installer.
  $npm=(Get-Command npm.cmd -ErrorAction SilentlyContinue).Source
  if(-not $npm){throw "npm.cmd is required on the build computer."}
  Push-Location $stage
  try {
    & $npm ci --ignore-scripts --no-audit --no-fund
    if($LASTEXITCODE -ne 0){throw "Isolated npm ci failed (exit code $LASTEXITCODE)."}
    & $npm run build
    if($LASTEXITCODE -ne 0){throw "Isolated production build failed (exit code $LASTEXITCODE)."}

    $stagedModules=Join-Path $stage 'node_modules'
    $stagePath=[IO.Path]::GetFullPath($stage).TrimEnd('\')
    $modulesPath=[IO.Path]::GetFullPath($stagedModules)
    if([IO.Path]::GetDirectoryName($modulesPath) -ne $stagePath -or [IO.Path]::GetFileName($modulesPath) -ne 'node_modules'){
      throw 'Unsafe staged dependency cleanup path.'
    }
    Remove-Item -LiteralPath $modulesPath -Recurse -Force
    & $npm ci --omit=dev --ignore-scripts --no-audit --no-fund
    if($LASTEXITCODE -ne 0){throw "Isolated production dependency install failed (exit code $LASTEXITCODE)."}

    # npm workspace links point back into the staged source tree and are unnecessary
    # at runtime. Remove only those known links plus command shims before archiving.
    $workspaceLinks=Join-Path $stagedModules '@grmetro'
    if(Test-Path -LiteralPath $workspaceLinks){
      foreach($link in Get-ChildItem -LiteralPath $workspaceLinks -Force){
        if(-not($link.Attributes -band [IO.FileAttributes]::ReparsePoint)){throw "Unexpected non-link in staged workspace links: $($link.FullName)"}
        [IO.Directory]::Delete($link.FullName)
      }
      Remove-Item -LiteralPath $workspaceLinks -Force
    }
    $commandShims=Join-Path $stagedModules '.bin'
    if(Test-Path -LiteralPath $commandShims){Remove-Item -LiteralPath $commandShims -Recurse -Force}
    # Playwright 1.62 includes agent/CLI skill documentation with path names long
    # enough to exceed legacy Windows extraction limits. GRMetro uses only the
    # library CDP client; these CLI documentation assets are never loaded.
    foreach($unusedPlaywrightPath in @('playwright-core\lib\tools\skills','playwright-core\lib\vite')){
      $unusedPath=Join-Path $stagedModules $unusedPlaywrightPath
      if(Test-Path -LiteralPath $unusedPath){Remove-Item -LiteralPath $unusedPath -Recurse -Force}
    }
  } finally {
    Pop-Location
  }

  # The reviewed source allowlist supplies everything needed for the isolated build,
  # but the target only needs backend/shared runtime code and the compiled dashboard.
  # Remove explicit build/test inputs from the disposable stage before the final
  # manifest is generated. Never discover or copy a development tree recursively.
  $stagePath=[IO.Path]::GetFullPath($stage).TrimEnd('\')
  foreach($relative in @(
    'apps\backend\test',
    'apps\dashboard\src',
    'apps\dashboard\test',
    'apps\dashboard\index.html',
    'apps\dashboard\vite.config.js',
    'apps\remote',
    'tests',
    'AGENTS.md',
    'README.md',
    'docs',
    'assets\references',
    'scripts\deployment-technicians.js',
    'scripts\deployment-goals.js',
    'scripts\check-javascript.js',
    'scripts\workspace-status.js'
  )){
    $buildOnlyPath=[IO.Path]::GetFullPath((Join-Path $stagePath $relative))
    if(-not $buildOnlyPath.StartsWith($stagePath+'\',[StringComparison]::OrdinalIgnoreCase)){throw "Unsafe staged build-only path: $relative"}
    if(Test-Path -LiteralPath $buildOnlyPath){
      if((Get-Item -LiteralPath $buildOnlyPath -Force).Attributes -band [IO.FileAttributes]::ReparsePoint){throw "Build-only path is a reparse point: $relative"}
      Remove-Item -LiteralPath $buildOnlyPath -Recurse -Force
    }
  }

  # Embed a pinned official Node runtime so the destination never resolves node.exe
  # through PATH. The checksum is reviewed in runtime-versions.json.
  $runtimeConfig=Get-Content -LiteralPath (Join-Path $root 'scripts\windows\runtime-versions.json') -Raw|ConvertFrom-Json
  $nodeVersion=[string]$runtimeConfig.node.version
  $nodeUrl=[string]$runtimeConfig.node.windowsX64Url
  $nodeSha=([string]$runtimeConfig.node.windowsX64Sha256).ToUpperInvariant()
  if(-not $nodeVersion -or -not $nodeUrl -or $nodeSha -notmatch '^[A-F0-9]{64}$'){throw 'Invalid pinned Node runtime configuration.'}
  $runtimeCache=Join-Path $root 'dist\windows-runtime-cache'
  New-Item -ItemType Directory -Force -Path $runtimeCache|Out-Null
  $nodeArchive=Join-Path $runtimeCache ("node-v{0}-win-x64.zip" -f $nodeVersion)
  $archiveValid=(Test-Path -LiteralPath $nodeArchive -PathType Leaf) -and ((Get-FileHash -LiteralPath $nodeArchive -Algorithm SHA256).Hash -eq $nodeSha)
  if(-not $archiveValid){
    if(Test-Path -LiteralPath $nodeArchive){Remove-Item -LiteralPath $nodeArchive -Force}
    [Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12
    Invoke-WebRequest -UseBasicParsing -Uri $nodeUrl -OutFile $nodeArchive
  }
  $actualSha=(Get-FileHash -LiteralPath $nodeArchive -Algorithm SHA256).Hash
  if($actualSha -ne $nodeSha){throw "Downloaded Node runtime checksum mismatch. Expected $nodeSha; found $actualSha."}
  Add-Type -AssemblyName System.IO.Compression.FileSystem
  $runtimeRoot=Join-Path $stage 'runtime\node'
  New-Item -ItemType Directory -Force -Path $runtimeRoot|Out-Null
  $nodeZip=[IO.Compression.ZipFile]::OpenRead($nodeArchive)
  try {
    $prefix="node-v$nodeVersion-win-x64/"
    foreach($item in @(@{Name='node.exe';Output='node.exe'},@{Name='LICENSE';Output='LICENSE'})){
      $entry=$nodeZip.GetEntry($prefix+$item.Name)
      if(-not $entry){throw "Pinned Node archive is missing $($item.Name)."}
      [IO.Compression.ZipFileExtensions]::ExtractToFile($entry,(Join-Path $runtimeRoot $item.Output),$true)
    }
  } finally {$nodeZip.Dispose()}
  Set-Content -LiteralPath (Join-Path $runtimeRoot 'VERSION') -Value ("v$nodeVersion") -Encoding ASCII
  $bundledVersion=(& (Join-Path $runtimeRoot 'node.exe') --version).Trim()
  if($bundledVersion -ne "v$nodeVersion"){throw "Bundled Node runtime reported $bundledVersion instead of v$nodeVersion."}

  $commit='packaged'
  $sourceState='packaged'
  $gitCommand=Get-Command git.exe -ErrorAction SilentlyContinue
  if($gitCommand){
    $candidate=(& $gitCommand.Source -C $root rev-parse --short HEAD 2>$null)
    if($LASTEXITCODE -eq 0 -and $candidate){
      $commit=$candidate.Trim();$sourceState='committed'
      $changes=@(& $gitCommand.Source -C $root status --porcelain --untracked-files=all | Where-Object{$_ -notmatch '^\?\? data/'} )
      if($changes.Count -gt 0){$sourceState='working-tree'}
    }
  }
  $buildMetadata=New-GrMetroReleaseMetadata -ReleaseVersion $ReleaseVersion -Channel $Channel -Commit $commit -SourceState $sourceState -BuiltAt ((Get-Date).ToUniversalTime().ToString('o')) -UpdaterProtocol $UpdaterProtocol -NodeVersion $bundledVersion
  [IO.File]::WriteAllText((Join-Path $stage 'scripts\windows\package-build.json'),(($buildMetadata|ConvertTo-Json -Depth 3)+[Environment]::NewLine),(New-Object Text.UTF8Encoding $false))
  $null=Write-GrMetroPortablePackageManifest -StageRoot $stage

  $zip=Join-Path $out "grmetro-performance-center-package.zip"
  if(Test-Path $zip){Remove-Item $zip -Force}
  [IO.Compression.ZipFile]::CreateFromDirectory($stage, $zip)
  $updateHostZip=Join-Path $out 'grmetro-update-host.zip'
  if(Test-Path -LiteralPath $updateHostZip){Remove-Item -LiteralPath $updateHostZip -Force}
  [IO.Compression.ZipFile]::CreateFromDirectory($updateHostOut,$updateHostZip)

  $bootstrap=Join-Path $out "install-grmetro-performance-center.ps1"
  Copy-Item (Join-Path $PSScriptRoot "install-grmetro-performance-center.ps1") $bootstrap -Force
  $packageHelper=Join-Path $out 'package-files.ps1'
  Copy-Item (Join-Path $PSScriptRoot 'package-files.ps1') $packageHelper -Force
  $processHelper=Join-Path $out 'process-control.ps1'
  Copy-Item (Join-Path $PSScriptRoot 'process-control.ps1') $processHelper -Force
  $launchHelper=Join-Path $out 'launch-integration.ps1'
  Copy-Item (Join-Path $PSScriptRoot 'launch-integration.ps1') $launchHelper -Force

  # Keep a portable fallback alongside the EXE for troubleshooting.
  $cmd=Join-Path $out "install.cmd"
  Set-Content $cmd '@echo off
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0install-grmetro-performance-center.ps1" -PackageZip "%~dp0grmetro-performance-center-package.zip" -UpdateHostBundle "%~dp0grmetro-update-host.zip"
' -Encoding ASCII

  $setupExe=Join-Path $out "GRMetro Performance Center Setup.exe"
  if(Test-Path $setupExe){Remove-Item $setupExe -Force}

  # IExpress is inconsistent across Windows builds and can silently fail even with a
  # syntactically valid SED file. Build our own tiny self-extracting bootstrap instead.
  # The generated Setup EXE embeds only the installer script and package ZIP, extracts
  # them to a private temp folder, runs the existing installer, then cleans up.
  $source=@'
using System;
using System.Diagnostics;
using System.IO;
using System.Reflection;
using System.Windows.Forms;

static class Program {
  static void ExtractResource(string resourceName, string destination) {
    using (Stream input = Assembly.GetExecutingAssembly().GetManifestResourceStream(resourceName)) {
      if (input == null) throw new InvalidOperationException("Missing embedded installer resource: " + resourceName);
      using (FileStream output = File.Create(destination)) input.CopyTo(output);
    }
  }

  [STAThread]
  static int Main() {
    string temp = Path.Combine(Path.GetTempPath(), "GRMetro-Setup-" + Guid.NewGuid().ToString("N"));
    try {
      Directory.CreateDirectory(temp);
      string script = Path.Combine(temp, "install-grmetro-performance-center.ps1");
      string package = Path.Combine(temp, "grmetro-performance-center-package.zip");
      string updateHost = Path.Combine(temp, "grmetro-update-host.zip");
      ExtractResource("GRMetroInstallerScript", script);
      ExtractResource("GRMetroInstallerPackage", package);
      ExtractResource("GRMetroUpdateHostPackage", updateHost);
      ExtractResource("GRMetroPackageHelper", Path.Combine(temp, "package-files.ps1"));
      ExtractResource("GRMetroProcessHelper", Path.Combine(temp, "process-control.ps1"));
      ExtractResource("GRMetroLaunchHelper", Path.Combine(temp, "launch-integration.ps1"));

      var psi = new ProcessStartInfo(
        "powershell.exe",
        "-STA -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File \"" + script + "\" -PackageZip \"" + package + "\" -UpdateHostBundle \"" + updateHost + "\"");
      psi.WorkingDirectory = temp;
      psi.UseShellExecute = false;
      psi.CreateNoWindow = true;
      var process = Process.Start(psi);
      if (process == null) throw new InvalidOperationException("Could not start the GRMetro installer.");
      process.WaitForExit();
      return process.ExitCode;
    } catch (Exception ex) {
      MessageBox.Show(ex.Message, "GRMetro Performance Center Setup", MessageBoxButtons.OK, MessageBoxIcon.Error);
      return 1;
    } finally {
      try { Directory.Delete(temp, true); } catch { }
    }
  }
}
'@

  $tempSource=Join-Path $env:TEMP ("grmetro-setup-"+[guid]::NewGuid().ToString()+".cs")
  Set-Content -Path $tempSource -Value $source -Encoding UTF8
  try {
    $runtimeDir=[System.Runtime.InteropServices.RuntimeEnvironment]::GetRuntimeDirectory()
    $csc=Join-Path $runtimeDir "csc.exe"
    if(-not(Test-Path $csc)){
      $csc=(Get-ChildItem "$env:WINDIR\Microsoft.NET\Framework64\v4*\csc.exe","$env:WINDIR\Microsoft.NET\Framework\v4*\csc.exe" -ErrorAction SilentlyContinue |
        Sort-Object FullName -Descending | Select-Object -First 1 -ExpandProperty FullName)
    }
    if(-not $csc -or -not(Test-Path $csc)){throw "Windows C# compiler (csc.exe) was not found."}

    $icon=Join-Path $root "assets\branding\grmetro.ico"
    $args=@(
      '/nologo',
      '/target:winexe',
      ("/out:`"{0}`"" -f $setupExe),
      '/reference:System.dll',
      '/reference:System.Windows.Forms.dll',
      ("/resource:`"{0}`",GRMetroInstallerScript" -f $bootstrap),
      ("/resource:`"{0}`",GRMetroInstallerPackage" -f $zip),
      ("/resource:`"{0}`",GRMetroUpdateHostPackage" -f $updateHostZip),
      ("/resource:`"{0}`",GRMetroProcessHelper" -f $processHelper),
      ("/resource:`"{0}`",GRMetroLaunchHelper" -f $launchHelper),
      $tempSource
    )
    if(Test-Path $icon){
      $args=@('/nologo','/target:winexe',("/out:`"{0}`"" -f $setupExe),("/win32icon:`"{0}`"" -f $icon),'/reference:System.dll','/reference:System.Windows.Forms.dll',("/resource:`"{0}`",GRMetroInstallerScript" -f $bootstrap),("/resource:`"{0}`",GRMetroInstallerPackage" -f $zip),("/resource:`"{0}`",GRMetroUpdateHostPackage" -f $updateHostZip),("/resource:`"{0}`",GRMetroProcessHelper" -f $processHelper),("/resource:`"{0}`",GRMetroLaunchHelper" -f $launchHelper),$tempSource)
    }

    $args += ("/resource:`"{0}`",GRMetroPackageHelper" -f $packageHelper)
    & $csc @args
    if($LASTEXITCODE -ne 0){throw "Setup EXE compiler exited with code $LASTEXITCODE."}
    if(-not(Test-Path $setupExe)){throw "Compiler completed but 'GRMetro Performance Center Setup.exe' was not created."}
    $null=Invoke-GrMetroAuthenticodeSigning -Files @($setupExe) -SignToolPath $SignToolPath -CertificateThumbprint $CertificateThumbprint -TimestampUrl $TimestampUrl -RequireAuthenticode:$RequireAuthenticode

    Write-Host "Built $setupExe" -ForegroundColor Green
    Write-Host "Self-contained installer includes the package and installer bootstrap." -ForegroundColor DarkGray
    Write-Host "Portable fallback files are also retained in $out." -ForegroundColor DarkGray
    & powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $root 'tests\windows-portable-package-validation.ps1') -PackageZip $zip -SetupExe $setupExe
    if($LASTEXITCODE -ne 0){throw "Portable package validation exited with code $LASTEXITCODE."}
  } finally {
    Remove-Item $tempSource -Force -ErrorAction SilentlyContinue
  }
} finally {
  $stagePath=[IO.Path]::GetFullPath($stage)
  $tempRoot=[IO.Path]::GetFullPath($env:TEMP).TrimEnd('\')
  if ([IO.Path]::GetDirectoryName($stagePath) -ne $tempRoot -or [IO.Path]::GetFileName($stagePath) -notlike 'grmetro-package-*') { throw 'Unsafe staging cleanup path.' }
  Remove-Item -LiteralPath $stagePath -Recurse -Force -ErrorAction SilentlyContinue
}
