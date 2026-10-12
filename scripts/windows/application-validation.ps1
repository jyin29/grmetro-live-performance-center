# Side-effect-free application validation for routine updates and Setup.
# It never runs configuration, firewall, shortcut, autostart, or ServiceTitan login work.
function Invoke-GrMetroApplicationValidation {
  param(
    [string]$InstallRoot,
    [string]$ExpectedReleaseVersion,
    [int]$HealthTimeoutSeconds=45,
    [int]$Port=3000,
    [switch]$SkipBackendStart
  )
  $root=[IO.Path]::GetFullPath($InstallRoot).TrimEnd('\')
  if(-not(Test-Path -LiteralPath $root -PathType Container)){throw 'Installed application directory is missing.'}
  $required=@(
    'GRMetro Performance Center.exe',
    'apps\dashboard\dist\index.html',
    'apps\backend\src\index.js',
    'node_modules\express\package.json',
    'node_modules\playwright\package.json',
    'node_modules\qrcode-terminal\package.json',
    'scripts\windows\package-manifest.json',
    'scripts\windows\package-build.json',
    'scripts\windows\runtime-paths.ps1',
    'scripts\windows\performance-center-launcher-host.ps1'
  )
  foreach($relative in $required){if(-not(Test-Path -LiteralPath (Join-Path $root $relative)-PathType Leaf)){throw "Installed application validation missing: $relative"}}

  . (Join-Path $root 'scripts\windows\runtime-paths.ps1')
  . (Join-Path $root 'scripts\windows\release-identity.ps1')
  $metadata=Get-GrMetroInstalledReleaseMetadata $root
  if($ExpectedReleaseVersion -and [string]$metadata.releaseVersion -ne $ExpectedReleaseVersion){throw "Installed release version $($metadata.releaseVersion) does not match expected release $ExpectedReleaseVersion."}

  $node=Get-GrMetroNodePath $root
  $nodeVersion=(& $node --version 2>$null).Trim()
  if($LASTEXITCODE -ne 0 -or $nodeVersion -notmatch '^v\d+\.\d+\.\d+$'){throw 'The bundled Node runtime could not start.'}
  $moduleProbe="for (const name of ['express','playwright','qrcode-terminal']) require(name); process.stdout.write('modules-ok'); process.exit(0)"
  Push-Location $root
  try{$moduleResult=(& $node -e $moduleProbe 2>&1|Out-String).Trim()}finally{Pop-Location}
  if($LASTEXITCODE -ne 0 -or $moduleResult -ne 'modules-ok'){throw "Packaged production modules could not load: $moduleResult"}

  $launcher=Join-Path $root 'scripts\windows\performance-center-launcher-host.ps1'
  & powershell.exe -STA -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File $launcher -SelfTest|Out-Null
  if($LASTEXITCODE -ne 0){throw 'The installed Control Center self-test failed.'}

  if($SkipBackendStart){return [pscustomobject]@{ReleaseVersion=[string]$metadata.releaseVersion;NodeVersion=$nodeVersion;BackendHealthy=$null;DashboardServed=$null;ServiceTitanRequired=$false}}
  if(-not(Test-Path -LiteralPath (Join-Path $root '.env')-PathType Leaf)){throw 'Installed configuration is missing. Routine update validation will not create or rewrite .env.'}
  $stdout=Join-Path ([IO.Path]::GetTempPath()) ('grmetro-update-validation-'+[guid]::NewGuid().ToString('N')+'.out')
  $stderr=$stdout+'.err';$process=$null
  try{
    $start=New-Object Diagnostics.ProcessStartInfo
    $start.FileName=$node;$start.Arguments='apps/backend/src/index.js';$start.WorkingDirectory=$root
    $start.UseShellExecute=$false;$start.CreateNoWindow=$true;$start.RedirectStandardOutput=$true;$start.RedirectStandardError=$true
    # Start the real production provider against an intentionally unavailable local
    # CDP endpoint. Backend health must not depend on ServiceTitan authentication,
    # and validation must never attach to the operator's real Edge profile/session.
    $start.EnvironmentVariables['NODE_ENV']='production';$start.EnvironmentVariables['MOCK_MODE']='false';$start.EnvironmentVariables['ENABLE_DEVELOPMENT_ROUTES']='false';$start.EnvironmentVariables['HOST']='127.0.0.1';$start.EnvironmentVariables['PORT']=[string]$Port
    $start.EnvironmentVariables['EDGE_DEBUG_URL']='http://127.0.0.1:1';$start.EnvironmentVariables['EDGE_CONNECTION_TIMEOUT_MILLISECONDS']='1000'
    $process=New-Object Diagnostics.Process;$process.StartInfo=$start
    if(-not$process.Start()){throw 'Could not start the packaged backend for validation.'}
    $stdoutTask=$process.StandardOutput.ReadToEndAsync();$stderrTask=$process.StandardError.ReadToEndAsync()
    $deadline=(Get-Date).AddSeconds($HealthTimeoutSeconds);$health=$null
    do{
      if($process.HasExited){
        $detail=try{([string]$stderrTask.Result).Trim()}catch{''}
        if($detail){$detail=($detail -split "`r?`n"|Select-Object -First 1).Replace($root,'the installed application');$detail=$detail.Substring(0,[Math]::Min(300,$detail.Length))}
        throw ("Packaged backend exited during validation (exit $($process.ExitCode))."+$(if($detail){" $detail"}else{''}))
      }
      try{$health=Invoke-RestMethod "http://127.0.0.1:$Port/api/v1/health" -TimeoutSec 2}catch{$health=$null}
      if($health -and $health.status -eq 'ok'){break}
      Start-Sleep -Milliseconds 500
    }while((Get-Date)-lt$deadline)
    if(-not$health -or $health.status -ne 'ok'){throw 'Packaged backend did not become healthy during update validation.'}
    if([string]$health.version -ne [string]$metadata.releaseVersion){throw "Backend reported release $($health.version) instead of $($metadata.releaseVersion)."}
    $dashboard=Invoke-WebRequest -UseBasicParsing "http://127.0.0.1:$Port/remote" -TimeoutSec 5
    if($dashboard.StatusCode -ne 200 -or [string]$dashboard.Content -notmatch '<div id="root"'){throw 'Packaged dashboard was not served during update validation.'}
    return [pscustomobject]@{ReleaseVersion=[string]$metadata.releaseVersion;NodeVersion=$nodeVersion;BackendHealthy=$true;DashboardServed=$true;ServiceTitanRequired=$false}
  }finally{
    if($process -and -not$process.HasExited){Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue;try{$process.WaitForExit(5000)|Out-Null}catch{}}
    if($process){try{if($stdoutTask){[IO.File]::WriteAllText($stdout,$stdoutTask.Result)};if($stderrTask){[IO.File]::WriteAllText($stderr,$stderrTask.Result)}}catch{};$process.Dispose()}
    Remove-Item -LiteralPath $stdout,$stderr -Force -ErrorAction SilentlyContinue
  }
}
