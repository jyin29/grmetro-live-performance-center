param([Parameter(Mandatory=$true)][string]$Root,[Parameter(Mandatory=$true)][int]$Port)
$ErrorActionPreference='Stop'
$base=[IO.Path]::GetFullPath($Root).TrimEnd('\')
$listener=New-Object Net.HttpListener;$listener.Prefixes.Add("http://127.0.0.1:$Port/");$listener.Start()
try{
  while($true){
    $context=$listener.GetContext();$path=$context.Request.Url.AbsolutePath.TrimStart('/')
    if($path-eq'__stop'){$context.Response.StatusCode=204;$context.Response.Close();break}
    if($path-eq'redirect-unapproved'){$context.Response.StatusCode=302;$context.Response.RedirectLocation='https://unapproved.example/release.json';$context.Response.Close();continue}
    if($path-eq'not-found'){$context.Response.StatusCode=404;$context.Response.Close();continue}
    $candidate=[IO.Path]::GetFullPath((Join-Path $base $path.Replace('/','\')))
    if(-not$candidate.StartsWith($base+'\',[StringComparison]::OrdinalIgnoreCase)-or-not(Test-Path -LiteralPath $candidate -PathType Leaf)){$context.Response.StatusCode=404;$context.Response.Close();continue}
    $bytes=[IO.File]::ReadAllBytes($candidate)
    if($path-eq'truncated.bin'){$context.Response.ContentLength64=$bytes.Length+25;$context.Response.OutputStream.Write($bytes,0,$bytes.Length);$context.Response.Abort();continue}
    $context.Response.StatusCode=200;$context.Response.ContentLength64=$bytes.Length;$context.Response.OutputStream.Write($bytes,0,$bytes.Length);$context.Response.Close()
  }
}finally{$listener.Stop();$listener.Close()}
