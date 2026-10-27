$ErrorActionPreference="Stop"
$root=(Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
Set-Location $root
. (Join-Path $PSScriptRoot 'package-files.ps1')

& powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot "build-launcher-exe.ps1")
if($LASTEXITCODE -ne 0){throw "Could not build launcher EXE."}

$out=Join-Path $root "dist\windows-installer"
New-Item -ItemType Directory -Force -Path $out|Out-Null
$stage=Join-Path $env:TEMP ("grmetro-package-"+[guid]::NewGuid().ToString())
New-Item -ItemType Directory -Force -Path $stage|Out-Null

try {
  Copy-GrMetroPackageFiles -SourceRoot $root -StageRoot $stage

  $zip=Join-Path $out "grmetro-performance-center-package.zip"
  if(Test-Path $zip){Remove-Item $zip -Force}
  Add-Type -AssemblyName System.IO.Compression.FileSystem
  [IO.Compression.ZipFile]::CreateFromDirectory($stage, $zip)

  $bootstrap=Join-Path $out "install-grmetro-performance-center.ps1"
  Copy-Item (Join-Path $PSScriptRoot "install-grmetro-performance-center.ps1") $bootstrap -Force
  $packageHelper=Join-Path $out 'package-files.ps1'
  Copy-Item (Join-Path $PSScriptRoot 'package-files.ps1') $packageHelper -Force

  # Keep a portable fallback alongside the EXE for troubleshooting.
  $cmd=Join-Path $out "install.cmd"
  Set-Content $cmd '@echo off
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0install-grmetro-performance-center.ps1" -PackageZip "%~dp0grmetro-performance-center-package.zip"
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
      ExtractResource("GRMetroInstallerScript", script);
      ExtractResource("GRMetroInstallerPackage", package);
      ExtractResource("GRMetroPackageHelper", Path.Combine(temp, "package-files.ps1"));

      var psi = new ProcessStartInfo(
        "powershell.exe",
        "-STA -NoProfile -ExecutionPolicy Bypass -File \"" + script + "\" -PackageZip \"" + package + "\"");
      psi.WorkingDirectory = temp;
      psi.UseShellExecute = false;
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
      $tempSource
    )
    if(Test-Path $icon){
      $args=@('/nologo','/target:winexe',("/out:`"{0}`"" -f $setupExe),("/win32icon:`"{0}`"" -f $icon),'/reference:System.dll','/reference:System.Windows.Forms.dll',("/resource:`"{0}`",GRMetroInstallerScript" -f $bootstrap),("/resource:`"{0}`",GRMetroInstallerPackage" -f $zip),$tempSource)
    }

    $args += ("/resource:`"{0}`",GRMetroPackageHelper" -f $packageHelper)
    & $csc @args
    if($LASTEXITCODE -ne 0){throw "Setup EXE compiler exited with code $LASTEXITCODE."}
    if(-not(Test-Path $setupExe)){throw "Compiler completed but 'GRMetro Performance Center Setup.exe' was not created."}

    Write-Host "Built $setupExe" -ForegroundColor Green
    Write-Host "Self-contained installer includes the package and installer bootstrap." -ForegroundColor DarkGray
    Write-Host "Portable fallback files are also retained in $out." -ForegroundColor DarkGray
  } finally {
    Remove-Item $tempSource -Force -ErrorAction SilentlyContinue
  }
} finally {
  $stagePath=[IO.Path]::GetFullPath($stage)
  $tempRoot=[IO.Path]::GetFullPath($env:TEMP).TrimEnd('\')
  if ([IO.Path]::GetDirectoryName($stagePath) -ne $tempRoot -or [IO.Path]::GetFileName($stagePath) -notlike 'grmetro-package-*') { throw 'Unsafe staging cleanup path.' }
  Remove-Item -LiteralPath $stagePath -Recurse -Force -ErrorAction SilentlyContinue
}
