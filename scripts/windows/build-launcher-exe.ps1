$ErrorActionPreference="Stop"
Add-Type -AssemblyName System.Drawing
$root=(Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$exe=Join-Path $root "GRMetro Performance Center.exe"
$icon=Join-Path $root "assets\branding\grmetro.ico"
$png=Join-Path $root "assets\branding\grmetro-logo.png"
if(Test-Path $png){
  try{
    $bmp=[System.Drawing.Bitmap]::FromFile($png);$scaled=New-Object System.Drawing.Bitmap 256,256;$g=[System.Drawing.Graphics]::FromImage($scaled);$g.Clear([System.Drawing.Color]::Transparent);$g.DrawImage($bmp,0,0,256,256);$h=$scaled.GetHicon();$ico=[System.Drawing.Icon]::FromHandle($h);$stream=[System.IO.File]::Create($icon);$ico.Save($stream);$stream.Close();$g.Dispose();$scaled.Dispose();$bmp.Dispose()
  }catch{}
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
    if(!File.Exists(script)){MessageBox.Show("GRMetro launcher files are missing.","GRMetro Performance Center",MessageBoxButtons.OK,MessageBoxIcon.Error);return;}
    var psi=new ProcessStartInfo("powershell.exe", "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File \""+script+"\" -AutoStart");
    psi.WorkingDirectory=root;psi.UseShellExecute=false;psi.CreateNoWindow=true;Process.Start(psi);
  }
}
'@
if(Test-Path $exe){Remove-Item $exe -Force}
$options="/target:winexe"
if(Test-Path $icon){$options+=" /win32icon:`"$icon`""}
Add-Type -TypeDefinition $source -Language CSharp -ReferencedAssemblies "System.Windows.Forms" -OutputAssembly $exe -OutputType WindowsApplication -CompilerOptions $options
Write-Host "Built $exe" -ForegroundColor Green
