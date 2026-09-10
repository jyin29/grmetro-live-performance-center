$ErrorActionPreference="Stop"
Add-Type -AssemblyName System.Drawing
$root=(Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$exe=Join-Path $root "GRMetro Performance Center.exe"
$icon=Join-Path $root "assets\branding\grmetro.ico"
$png=Join-Path $root "assets\branding\grmetro-logo.png"

if(Test-Path $png){
  try{
    $bmp=[System.Drawing.Bitmap]::FromFile($png)
    $scaled=New-Object System.Drawing.Bitmap 256,256
    $g=[System.Drawing.Graphics]::FromImage($scaled)
    $g.Clear([System.Drawing.Color]::Transparent)
    $g.DrawImage($bmp,0,0,256,256)
    $h=$scaled.GetHicon()
    $ico=[System.Drawing.Icon]::FromHandle($h)
    $stream=[System.IO.File]::Create($icon)
    $ico.Save($stream)
    $stream.Close()
    $g.Dispose();$scaled.Dispose();$bmp.Dispose()
  }catch{
    Write-Host "Could not generate launcher icon; continuing without a custom icon." -ForegroundColor Yellow
  }
}

$source=@'
using System;
using System.Diagnostics;
using System.IO;
using System.Windows.Forms;
static class Program {
  [STAThread]
  static void Main() {
    var root = AppDomain.CurrentDomain.BaseDirectory;
    var script = Path.Combine(root,"scripts","windows","performance-center-launcher.ps1");
    if(!File.Exists(script)){
      MessageBox.Show("GRMetro launcher files are missing.","GRMetro Performance Center",MessageBoxButtons.OK,MessageBoxIcon.Error);
      return;
    }
    var psi=new ProcessStartInfo("powershell.exe", "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File \""+script+"\" -AutoStart");
    psi.WorkingDirectory=root;
    psi.UseShellExecute=false;
    psi.CreateNoWindow=true;
    Process.Start(psi);
  }
}
'@

if(Test-Path $exe){Remove-Item $exe -Force}
$tempSource=Join-Path $env:TEMP ("grmetro-launcher-"+[guid]::NewGuid().ToString()+".cs")
Set-Content -Path $tempSource -Value $source -Encoding UTF8
try {
  $runtimeDir=[System.Runtime.InteropServices.RuntimeEnvironment]::GetRuntimeDirectory()
  $csc=Join-Path $runtimeDir "csc.exe"
  if(-not(Test-Path $csc)){
    $csc=(Get-ChildItem "$env:WINDIR\Microsoft.NET\Framework64\v4*\csc.exe","$env:WINDIR\Microsoft.NET\Framework\v4*\csc.exe" -ErrorAction SilentlyContinue | Sort-Object FullName -Descending | Select-Object -First 1 -ExpandProperty FullName)
  }
  if(-not $csc -or -not(Test-Path $csc)){throw "Windows C# compiler (csc.exe) was not found."}

  $args=@('/nologo','/target:winexe',("/out:`"{0}`"" -f $exe),'/reference:System.dll','/reference:System.Windows.Forms.dll',$tempSource)
  if(Test-Path $icon){$args=@('/nologo','/target:winexe',("/out:`"{0}`"" -f $exe),("/win32icon:`"{0}`"" -f $icon),'/reference:System.dll','/reference:System.Windows.Forms.dll',$tempSource)}
  & $csc @args
  if($LASTEXITCODE -ne 0){throw "C# compiler exited with code $LASTEXITCODE."}
  if(-not(Test-Path $exe)){throw "Compiler completed but launcher EXE was not created."}
  Write-Host "Built $exe" -ForegroundColor Green
} finally {
  Remove-Item $tempSource -Force -ErrorAction SilentlyContinue
}
