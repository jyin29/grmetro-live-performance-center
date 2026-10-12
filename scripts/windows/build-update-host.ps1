param([string]$OutputDirectory)
$ErrorActionPreference='Stop'
$root=(Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
if(-not$OutputDirectory){$OutputDirectory=Join-Path $root 'dist\windows-update-host'}
New-Item -ItemType Directory -Force -Path $OutputDirectory|Out-Null
$source=@'
using System;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Windows.Forms;
static class Program {
  static string Quote(string value) { return "\"" + value.Replace("\"", "\\\"") + "\""; }
  [STAThread]
  static int Main(string[] args) {
    string root=AppDomain.CurrentDomain.BaseDirectory;
    string script=Path.Combine(root,"update-host.ps1");
    if(!File.Exists(script)){MessageBox.Show("GRMetro Update Host files are incomplete.","GRMetro Update Host",MessageBoxButtons.OK,MessageBoxIcon.Error);return 1;}
    var all=new[]{"-STA","-NoProfile","-ExecutionPolicy","Bypass","-WindowStyle","Hidden","-File",Quote(script)}.Concat(args.Select(Quote));
    var start=new ProcessStartInfo("powershell.exe",String.Join(" ",all));
    start.WorkingDirectory=root;start.UseShellExecute=false;start.CreateNoWindow=true;
    try{using(var process=Process.Start(start)){if(process==null)throw new InvalidOperationException("Could not start the update worker.");process.WaitForExit();return process.ExitCode;}}
    catch(Exception ex){MessageBox.Show(ex.Message,"GRMetro Update Host",MessageBoxButtons.OK,MessageBoxIcon.Error);return 1;}
  }
}
'@
$temp=Join-Path $env:TEMP ('grmetro-update-host-'+[guid]::NewGuid().ToString('N')+'.cs')
[IO.File]::WriteAllText($temp,$source,(New-Object Text.UTF8Encoding $false))
try{
  $runtimeDir=[Runtime.InteropServices.RuntimeEnvironment]::GetRuntimeDirectory();$csc=Join-Path $runtimeDir 'csc.exe'
  if(-not(Test-Path -LiteralPath $csc)){throw 'Windows C# compiler is unavailable on the build computer.'}
  $exe=Join-Path $OutputDirectory 'GRMetro Update Host.exe'
  $args=@('/nologo','/target:winexe',("/out:`"{0}`""-f$exe),'/reference:System.dll','/reference:System.Core.dll','/reference:System.Windows.Forms.dll',$temp)
  & $csc @args
  if($LASTEXITCODE -ne 0 -or -not(Test-Path -LiteralPath $exe)){throw 'GRMetro Update Host compilation failed.'}
  foreach($name in @('update-host.ps1','package-files.ps1','process-control.ps1','application-validation.ps1','release-identity.ps1','release-feed.ps1','authenticode-signing.ps1','release-source.default.json','release-public-keys.json')){Copy-Item -LiteralPath (Join-Path $PSScriptRoot $name) -Destination (Join-Path $OutputDirectory $name) -Force}
  Write-Output $exe
}finally{Remove-Item -LiteralPath $temp -Force -ErrorAction SilentlyContinue}
