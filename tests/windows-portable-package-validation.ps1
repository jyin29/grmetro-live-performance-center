param(
  [Parameter(Mandatory=$true)][string]$PackageZip,
  [Parameter(Mandatory=$true)][string]$SetupExe
)
$ErrorActionPreference = 'Stop'
$repository = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..')).TrimEnd('\')
. (Join-Path $repository 'scripts\windows\package-files.ps1')
function Assert($condition,[string]$message){if(-not $condition){throw $message}}
function Get-TechnicianIdentityMarkers([string]$Path){
  $source=Get-Content -LiteralPath $Path -Raw
  $records=[regex]::Matches($source,'\{\s*id:\s*(\d+),\s*name:\s*"([^"]+)"')
  Assert ($records.Count -gt 0) "$Path must expose reviewable technician fallback records."
  return @($records|ForEach-Object{@($_.Groups[1].Value,$_.Groups[2].Value)})
}

$package = [IO.Path]::GetFullPath($PackageZip)
$setup = [IO.Path]::GetFullPath($SetupExe)
Assert (Test-Path -LiteralPath $package -PathType Leaf) 'Portable package ZIP is missing.'
Assert (Test-Path -LiteralPath $setup -PathType Leaf) 'Setup EXE is missing.'
$header=[IO.File]::ReadAllBytes($setup)[0..1]
Assert ($header[0] -eq 0x4d -and $header[1] -eq 0x5a) 'Setup output is not a Windows PE executable.'
$setupAssembly=[Reflection.Assembly]::LoadFile($setup);$resources=@($setupAssembly.GetManifestResourceNames())
  foreach($resource in @('GRMetroInstallerScript','GRMetroInstallerPackage','GRMetroPackageHelper','GRMetroProcessHelper','GRMetroLaunchHelper','GRMetroUpdateHostPackage')){Assert ($resources -contains $resource) "Setup EXE is missing embedded resource: $resource"}
$updateHostBundle=Join-Path ([IO.Path]::GetDirectoryName($setup)) 'grmetro-update-host.zip'
Assert (Test-Path -LiteralPath $updateHostBundle -PathType Leaf) 'Stable Update Host bundle is missing.'
Add-Type -AssemblyName System.IO.Compression.FileSystem
$hostInspect=Join-Path ([IO.Path]::GetTempPath()) ('gm-host-inspect-'+[guid]::NewGuid().ToString('N'))
[IO.Compression.ZipFile]::ExtractToDirectory($updateHostBundle,$hostInspect)
try{
  $hostFiles=@(Get-ChildItem -LiteralPath $hostInspect -File|ForEach-Object{$_.Name}|Sort-Object)
  $expectedHostFiles=@('application-validation.ps1','authenticode-signing.ps1','GRMetro Update Host.exe','package-files.ps1','process-control.ps1','provisioning-policy.json','release-identity.ps1','release-feed.ps1','release-source.default.json','release-public-keys.json','update-host.ps1'|Sort-Object)
  Assert (($hostFiles-join'|')-eq($expectedHostFiles-join'|')) 'Stable Update Host bundle contains an unexpected inventory.'
  Assert ((Get-FileHash -LiteralPath (Join-Path $hostInspect 'package-files.ps1') -Algorithm SHA256).Hash -eq (Get-FileHash -LiteralPath (Join-Path $repository 'scripts\windows\package-files.ps1') -Algorithm SHA256).Hash) 'Update Host transaction engine differs from the authoritative source.'
  $hostText=@('update-host.ps1','package-files.ps1','process-control.ps1','application-validation.ps1','authenticode-signing.ps1','release-identity.ps1','release-feed.ps1','release-source.default.json','release-public-keys.json','provisioning-policy.json'|ForEach-Object{Get-Content -LiteralPath (Join-Path $hostInspect $_)-Raw})-join"`n"
  Assert ($hostText -notmatch '(?i)\bgit(?:\.exe)?\b|\bnpm(?:\.cmd)?\b') 'Update Host bundle depends on Git or npm.'
  Assert ($hostText -notlike "*$repository*") 'Update Host bundle contains the developer repository path.'
  $policy=Get-Content -LiteralPath (Join-Path $hostInspect 'provisioning-policy.json') -Raw|ConvertFrom-Json
  $hostSource=Get-Content -LiteralPath (Join-Path $hostInspect 'release-source.default.json') -Raw|ConvertFrom-Json;$hostKeys=Get-Content -LiteralPath (Join-Path $hostInspect 'release-public-keys.json') -Raw|ConvertFrom-Json
  Assert ([int]$policy.schemaVersion -eq 1) 'Update Host provisioning policy schema is invalid.'
  if($policy.applyOnSetup){Assert ($hostSource.enabled -eq $true -and @($hostKeys.keys).Count -gt 0) 'Provisioned migration candidate lacks enabled source or public keys.'}
  else{Assert ($hostSource.enabled -eq $false -and @($hostKeys.keys).Count -eq 0) 'Default package unexpectedly provisions update trust.'}
  $unsignedMarker=Join-Path ([IO.Path]::GetDirectoryName($setup)) 'NOT-PRODUCTION-READY-UNSIGNED.txt'
  if(Test-Path -LiteralPath $unsignedMarker){Assert ((Get-AuthenticodeSignature -LiteralPath $setup).Status -ne 'Valid') 'Unsigned marker accompanied a validly signed Setup unexpectedly.'}
  else{Assert ((Get-AuthenticodeSignature -LiteralPath $setup).Status -eq 'Valid') 'Production candidate lacks both unsigned marker and valid Setup signature.';Assert ((Get-AuthenticodeSignature -LiteralPath (Join-Path $hostInspect 'GRMetro Update Host.exe')).Status -eq 'Valid') 'Production Update Host Authenticode signature is invalid.'}
}finally{Remove-Item -LiteralPath $hostInspect -Recurse -Force -ErrorAction SilentlyContinue}

$fixture=Join-Path ([IO.Path]::GetTempPath()) ('gmpv '+[guid]::NewGuid().ToString('N').Substring(0,8))
$installed=Join-Path $fixture 'PC With Spaces'
try{
  Install-GrMetroPackageFiles -PackageZip $package -InstallRoot $installed -DeferCommitCleanup
  $manifest=Get-Content -LiteralPath (Join-Path $installed 'scripts\windows\package-manifest.json') -Raw|ConvertFrom-Json
  Assert ($manifest.version -eq 2) 'Built package does not use the portable manifest format.'
  $files=@(Get-GrMetroPackageFiles $manifest)
  foreach($required in @('runtime/node/node.exe','runtime/node/LICENSE','runtime/node/VERSION','apps/dashboard/dist/index.html','node_modules/express/package.json','node_modules/playwright/package.json','node_modules/qrcode-terminal/package.json')){
    Assert ($files -contains $required) "Portable package is missing $required"
  }
  if(-not(Test-Path -LiteralPath (Join-Path ([IO.Path]::GetDirectoryName($setup)) 'NOT-PRODUCTION-READY-UNSIGNED.txt'))){Assert ((Get-AuthenticodeSignature -LiteralPath (Join-Path $installed 'GRMetro Performance Center.exe')).Status -eq 'Valid') 'Production native launcher Authenticode signature is invalid.'}
  foreach($forbidden in @('.env','data/company-config.json','data/goals.json','logs/supervisor.log','~.DDF','node_modules/vite/package.json','node_modules/nodemon/package.json')){
    Assert ($files -notcontains $forbidden) "Portable package contains forbidden or development-only content: $forbidden"
  }
  foreach($buildOnlyPrefix in @('tests/','apps/backend/test/','apps/dashboard/src/','apps/dashboard/test/','apps/remote/','docs/','assets/references/')){
    Assert (-not @($files|Where-Object{$_.StartsWith($buildOnlyPrefix,[StringComparison]::OrdinalIgnoreCase)})) "Portable package contains build-only path: $buildOnlyPrefix"
  }
  foreach($buildOnlyFile in @('AGENTS.md','README.md','apps/dashboard/index.html','apps/dashboard/vite.config.js','scripts/check-javascript.js','scripts/workspace-status.js','scripts/deployment-technicians.js','scripts/deployment-goals.js')){
    Assert ($files -notcontains $buildOnlyFile) "Portable package contains build-only file: $buildOnlyFile"
  }
  Assert (-not @($files|Where-Object{$_ -match '(?i)(^|/)(storage-state|auth-state|cookies|session)[^/]*\.json$'})) 'Portable package contains browser authentication/session material.'
  $canonicalIdentityMarkers=@(Get-TechnicianIdentityMarkers (Join-Path $repository 'shared\technicians.js'))
  $deploymentIdentityMarkers=@(Get-TechnicianIdentityMarkers (Join-Path $repository 'scripts\deployment-technicians.js'))
  $privateEmployeeMarkers=@($canonicalIdentityMarkers|Where-Object{$_ -notin $deploymentIdentityMarkers})
  Assert ($privateEmployeeMarkers.Count -gt 0) 'Canonical and deployment-safe technician identities must remain distinct.'
  foreach($file in @(Get-ChildItem -LiteralPath $installed -Recurse -File -Force|Where-Object{$_.Extension-in@('.js','.jsx','.json','.ps1','.cmd','.md','.css','.html','.txt') -and $_.Length-lt5MB})){$content=Get-Content -LiteralPath $file.FullName -Raw -ErrorAction SilentlyContinue;foreach($marker in $privateEmployeeMarkers){Assert ($content-notmatch[regex]::Escape($marker)) "Portable package exposes private employee configuration in $($file.FullName)"}}
  $installedScripts=Get-Item -LiteralPath (Join-Path $installed 'scripts') -Force
  Assert (-not($installedScripts.Attributes -band [IO.FileAttributes]::Hidden)) 'Clean install hid scripts before configuration completed.'
  $wizardPath=Join-Path $installed 'scripts\windows\env-wizard.ps1'
  Assert (Test-Path -LiteralPath $wizardPath -PathType Leaf) 'Clean package installation is missing the configuration wizard.'
  $wizardResult=Invoke-GrMetroPowerShellScript -ScriptPath $wizardPath -WorkingDirectory $installed -Arguments @('-ValidateOnly') -Sta
  Assert ($wizardResult.ExitCode -eq 0) "Installed configuration wizard preflight failed: $($wizardResult.StdErr) $($wizardResult.StdOut)"
  Assert ($wizardResult.StdOut -match 'validation passed') 'Installed configuration wizard did not complete its pre-window validation.'
  Complete-GrMetroUpgradeTransaction $installed
  Assert (-not(Test-Path -LiteralPath (Get-GrMetroUpgradeRoot $installed))) 'Clean-install wizard success left a recovery transaction.'
  $releaseMetadata=Get-Content -LiteralPath (Join-Path $installed 'scripts\windows\package-build.json') -Raw|ConvertFrom-Json
  . (Join-Path $installed 'scripts\windows\application-validation.ps1')
  $validationEnvironment=Join-Path $installed '.env'
  $configuredTechnicians='[{"id":200000001,"name":"Configured Tech 1","shortName":"Tech 1","initials":"C1"},{"id":200000002,"name":"Configured Tech 2","shortName":"Tech 2","initials":"C2"},{"id":200000003,"name":"Configured Tech 3","shortName":"Tech 3","initials":"C3"},{"id":200000004,"name":"Configured Tech 4","shortName":"Tech 4","initials":"C4"},{"id":200000005,"name":"Configured Tech 5","shortName":"Tech 5","initials":"C5"}]'
  [IO.File]::WriteAllText($validationEnvironment,"SERVICETITAN_BUSINESS_UNIT_IDS=1`r`nSERVICETITAN_TECHNICIANS_JSON=$configuredTechnicians`r`nEDGE_DEBUG_URL=http://127.0.0.1:9223`r`nMOCK_MODE=false`r`nENABLE_DEVELOPMENT_ROUTES=false`r`n",(New-Object Text.UTF8Encoding $false))
  $environmentHash=(Get-FileHash -LiteralPath $validationEnvironment -Algorithm SHA256).Hash
  $validationListener=New-Object Net.Sockets.TcpListener([Net.IPAddress]::Loopback,0);$validationListener.Start();$validationPort=([Net.IPEndPoint]$validationListener.LocalEndpoint).Port;$validationListener.Stop()
  $validationResult=Invoke-GrMetroApplicationValidation -InstallRoot $installed -ExpectedReleaseVersion ([string]$releaseMetadata.releaseVersion) -Port $validationPort -HealthTimeoutSeconds 35
  Assert ((Get-FileHash -LiteralPath $validationEnvironment -Algorithm SHA256).Hash -eq $environmentHash) 'Routine validation rewrote .env.'
  Assert ($validationResult.BackendHealthy -and $validationResult.DashboardServed -and -not$validationResult.ServiceTitanRequired) 'Side-effect-free application validation did not verify runtime health independently of ServiceTitan.'

  $textFiles=Get-ChildItem -LiteralPath $installed -Recurse -File -Force|Where-Object{$_.Extension -in @('.js','.jsx','.json','.ps1','.cmd','.md','.css','.html','.txt') -and $_.Length -lt 5MB}
  foreach($file in $textFiles){
    $content=Get-Content -LiteralPath $file.FullName -Raw -ErrorAction SilentlyContinue
    Assert ($content -notlike "*$repository*") "Packaged file contains the developer repository path: $($file.FullName)"
  }

  $node=Join-Path $installed 'runtime\node\node.exe'
  $expected=(Get-Content -LiteralPath (Join-Path $repository 'scripts\windows\runtime-versions.json') -Raw|ConvertFrom-Json).node.version
  $actual=(& $node --version).Trim()
  Assert ($actual -eq "v$expected") "Bundled Node runtime version mismatch: $actual"

  $probe=@'
require("express");
require("playwright");
require("ws");
require("dotenv");
require("qrcode-terminal");
process.stdout.write("portable dependencies ok");
'@
  $probePath=Join-Path $installed '.portability-probe.cjs'
  [IO.File]::WriteAllText($probePath,$probe,(New-Object Text.UTF8Encoding $false))
  function New-IsolatedNodeStart([string]$arguments){
    $start=New-Object Diagnostics.ProcessStartInfo
    $start.FileName=$node;$start.Arguments=$arguments;$start.WorkingDirectory=$installed
    $start.UseShellExecute=$false;$start.CreateNoWindow=$true;$start.RedirectStandardOutput=$true;$start.RedirectStandardError=$true
    return $start
  }
  $savedEnvironment=@{PATH=$env:PATH;NODE_ENV=$env:NODE_ENV;MOCK_MODE=$env:MOCK_MODE;ENABLE_DEVELOPMENT_ROUTES=$env:ENABLE_DEVELOPMENT_ROUTES;HOST=$env:HOST;PORT=$env:PORT}
  try{
    $env:PATH=Join-Path $env:WINDIR 'System32'
    $dependencyProcess=New-Object Diagnostics.Process;$dependencyProcess.StartInfo=New-IsolatedNodeStart ('"{0}"' -f $probePath)
    Assert $dependencyProcess.Start() 'Could not start bundled dependency probe.'
    $dependencyResult=$dependencyProcess.StandardOutput.ReadToEnd();$dependencyError=$dependencyProcess.StandardError.ReadToEnd();$dependencyProcess.WaitForExit()
    Assert ($dependencyProcess.ExitCode -eq 0 -and $dependencyResult -eq 'portable dependencies ok') "Bundled runtime could not load packaged production dependencies with global Node/npm removed from PATH. $dependencyError"

    $listener=New-Object Net.Sockets.TcpListener([Net.IPAddress]::Loopback,0)
    $listener.Start();$port=([Net.IPEndPoint]$listener.LocalEndpoint).Port;$listener.Stop()
    $env:NODE_ENV='test';$env:MOCK_MODE='true';$env:ENABLE_DEVELOPMENT_ROUTES='false';$env:HOST='127.0.0.1';$env:PORT=[string]$port
    $backend=New-Object Diagnostics.Process;$backend.StartInfo=New-IsolatedNodeStart 'apps/backend/src/index.js'
    Assert $backend.Start() 'Could not start packaged backend.'
    try{
      Assert ([IO.Path]::GetFullPath($backend.StartInfo.FileName) -eq [IO.Path]::GetFullPath($node)) 'Backend did not launch with the bundled Node executable.'
      $deadline=(Get-Date).AddSeconds(35);$health=$null
      do{Start-Sleep -Milliseconds 300;try{$health=Invoke-RestMethod -Uri "http://127.0.0.1:$port/api/v1/health" -TimeoutSec 2}catch{}}while(-not $health -and (Get-Date)-lt $deadline -and -not $backend.HasExited)
      if(-not $health){
        if(-not $backend.HasExited){$backend.Kill();$backend.WaitForExit()}
        $failureDetail=($backend.StandardError.ReadToEnd()+' '+$backend.StandardOutput.ReadToEnd()).Trim()
        throw "Packaged backend did not become healthy. $failureDetail"
      }
      Assert ($health.status -eq 'ok' -and $health.backend -eq 'running') 'Packaged backend health response was invalid.'
      Assert ([string]$health.version -eq [string]$releaseMetadata.releaseVersion) 'Packaged backend did not report canonical release metadata.'
      $goals=Invoke-RestMethod -Uri "http://127.0.0.1:$port/api/v1/management/goals" -TimeoutSec 5
      Assert ([int]$goals.technicians[0].id -eq 200000001 -and [string]$goals.technicians[0].name -eq 'Configured Tech 1') 'Packaged backend did not load private technician configuration before shared modules.'
      $remote=Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:$port/remote" -TimeoutSec 5
      Assert ($remote.StatusCode -eq 200 -and $remote.Content -match '<div id="root"') 'Packaged backend did not serve the built remote/dashboard application.'
    } finally {
      if($backend -and -not $backend.HasExited){$backend.Kill();$backend.WaitForExit()}
      $backendOutput=$backend.StandardOutput.ReadToEnd();$backendError=$backend.StandardError.ReadToEnd()
    }
  } finally {
    foreach($key in $savedEnvironment.Keys){if($null -eq $savedEnvironment[$key]){Remove-Item -Path "Env:$key" -ErrorAction SilentlyContinue}else{Set-Item -Path "Env:$key" -Value $savedEnvironment[$key]}}
  }
  Remove-Item -LiteralPath $validationEnvironment -Force -ErrorAction SilentlyContinue
  Write-Output "PASS: portable package runs from an isolated spaced path using only its bundled runtime, production dependencies, and built frontend."
} finally {
  $cleanup=[IO.Path]::GetFullPath($fixture)
  $tempRoot=[IO.Path]::GetFullPath([IO.Path]::GetTempPath()).TrimEnd('\')
  if([IO.Path]::GetDirectoryName($cleanup)-ne $tempRoot -or [IO.Path]::GetFileName($cleanup)-notlike 'gmpv *'){throw 'Unsafe portability fixture cleanup path.'}
  if(Test-Path -LiteralPath $cleanup){Remove-Item -LiteralPath $cleanup -Recurse -Force}
}
