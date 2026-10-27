param(
  [Parameter(Mandatory=$true)][string]$ApplicationPackage,
  [Parameter(Mandatory=$true)][string]$UpdateHostMigrationBundle,
  [Parameter(Mandatory=$true)][string]$ReleaseVersion,
  [Parameter(Mandatory=$true)][string]$LegacyCommit,
  [Parameter(Mandatory=$true)][string]$OutputPath
)
$ErrorActionPreference='Stop';$root=(Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$app=[IO.Path]::GetFullPath($ApplicationPackage);$hostBundle=[IO.Path]::GetFullPath($UpdateHostMigrationBundle);$output=[IO.Path]::GetFullPath($OutputPath)
foreach($path in @($app,$hostBundle)){if(-not(Test-Path -LiteralPath $path -PathType Leaf)){throw "Required payload is missing: $path"}}
if(Test-Path -LiteralPath $output){throw 'The immutable single-file upgrade output already exists.'}
$applicationHash=(Get-FileHash $app -Algorithm SHA256).Hash;$hostHash=(Get-FileHash $hostBundle -Algorithm SHA256).Hash
Add-Type -AssemblyName System.IO.Compression.FileSystem;$archive=[IO.Compression.ZipFile]::OpenRead($app);try{$entry=$archive.Entries|Where-Object{$_.FullName.Replace('\','/')-eq'scripts/windows/package-build.json'}|Select-Object -First 1;if(-not$entry){throw 'Application package identity missing.'};$reader=New-Object IO.StreamReader($entry.Open());try{$identity=$reader.ReadToEnd()|ConvertFrom-Json}finally{$reader.Dispose()}}finally{$archive.Dispose()}
if([string]$identity.releaseVersion-ne$ReleaseVersion-or[string]$identity.channel-ne'testing'-or[string]$identity.sourceState-ne'committed'){throw 'Application package identity does not match the requested internal upgrade.'}
$work=Join-Path $env:TEMP ('grmetro-single-file-build-'+[guid]::NewGuid().ToString('N'));$reviewRoot=Join-Path $work 'review';$payloadRoot=Join-Path $work 'payload';New-Item -ItemType Directory -Force -Path (Join-Path $reviewRoot 'payload'),(Join-Path $reviewRoot 'scripts\windows'),$payloadRoot|Out-Null
try{
  Copy-Item $app (Join-Path $reviewRoot 'payload\dashboard.zip');Copy-Item $hostBundle (Join-Path $reviewRoot 'payload\update-host-migration.zip')
  $scriptNames=@('application-validation.ps1','install-update-host.ps1','launch-integration.ps1','legacy-composite-upgrade.ps1','manual-legacy-upgrade.ps1','package-files.ps1','process-control.ps1','release-feed.ps1','release-identity.ps1','update-host-installation.ps1')
  foreach($name in $scriptNames){Copy-Item (Join-Path $PSScriptRoot $name) (Join-Path $reviewRoot "scripts\windows\$name")}
  $readme="GRMetro Legacy Composite Upgrade $ReleaseVersion`r`nTarget legacy applicationVersion 1.0.0, commit $LegacyCommit, manifest v2.`r`nUnsigned internal build. Requires explicit authorization and Defender review.`r`nThe application and Update Host are transactionally coordinated; ServiceTitan Edge is excluded.`r`n";[IO.File]::WriteAllText((Join-Path $reviewRoot 'README.txt'),$readme,(New-Object Text.UTF8Encoding($false)))
  $reviewFiles=@(Get-ChildItem $reviewRoot -Recurse -File|Where-Object{$_.Name-ne'SHA256SUMS.txt'}|Sort-Object FullName);$lines=@($reviewFiles|ForEach-Object{"$((Get-FileHash $_.FullName -Algorithm SHA256).Hash)  $($_.FullName.Substring($reviewRoot.Length+1).Replace('\','/'))"});[IO.File]::WriteAllLines((Join-Path $reviewRoot 'SHA256SUMS.txt'),$lines,(New-Object Text.UTF8Encoding($false)))
  $reviewZip=Join-Path $payloadRoot 'review.zip';[IO.Compression.ZipFile]::CreateFromDirectory($reviewRoot,$reviewZip);$reviewHash=(Get-FileHash $reviewZip -Algorithm SHA256).Hash
  $template=[IO.File]::ReadAllText((Join-Path $PSScriptRoot 'legacy-single-file-install.ps1')).Replace('__VERSION__',$ReleaseVersion).Replace('__LEGACY_COMMIT__',$LegacyCommit).Replace('__REVIEW_SHA256__',$reviewHash).Replace('__APPLICATION_SHA256__',$applicationHash).Replace('__HOST_SHA256__',$hostHash)
  [IO.File]::WriteAllText((Join-Path $payloadRoot 'install.ps1'),$template,(New-Object Text.UTF8Encoding($false)))
  $payloadZip=Join-Path $work 'payload.zip';[IO.Compression.ZipFile]::CreateFromDirectory($payloadRoot,$payloadZip);$payloadBytes=[IO.File]::ReadAllBytes($payloadZip);$payloadHash=(Get-FileHash $payloadZip -Algorithm SHA256).Hash;$base64=[Convert]::ToBase64String($payloadBytes)
  $bootstrap=@"
`$ErrorActionPreference='Stop'
`$work=Join-Path `$env:TEMP ('grmetro-internal-run-'+[guid]::NewGuid().ToString('N'));`$code=1
try{
  New-Item -ItemType Directory -Path `$work|Out-Null;`$self=[IO.File]::ReadAllText(`$env:GRMETRO_SELF);`$marker='::GRMETRO_PAYLOAD_BEGIN::';`$index=`$self.IndexOf(`$marker,[StringComparison]::Ordinal);if(`$index-lt0){throw'Embedded payload marker missing.'};`$bytes=[Convert]::FromBase64String((`$self.Substring(`$index+`$marker.Length)-replace'\s',''));`$zip=Join-Path `$work 'payload.zip';[IO.File]::WriteAllBytes(`$zip,`$bytes);if((Get-FileHash `$zip -Algorithm SHA256).Hash-ne'$payloadHash'){throw'Embedded payload hash mismatch.'}
  Add-Type -AssemblyName System.IO.Compression.FileSystem;`$archive=[IO.Compression.ZipFile]::OpenRead(`$zip);try{`$expected=@('install.ps1','review.zip');`$entries=@{};foreach(`$entry in `$archive.Entries){`$relative=`$entry.FullName.Replace('\','/');if([string]::IsNullOrWhiteSpace(`$entry.Name)-or`$relative-notin`$expected-or`$entries.ContainsKey(`$relative)){throw"Unexpected or duplicate payload entry: `$relative"};`$entries[`$relative]=`$entry};foreach(`$relative in `$expected){if(-not`$entries.ContainsKey(`$relative)){throw"Missing payload entry: `$relative"};[IO.Compression.ZipFileExtensions]::ExtractToFile(`$entries[`$relative],(Join-Path `$work `$relative),`$false)}}finally{`$archive.Dispose()}
  & powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path `$work 'install.ps1');`$code=`$LASTEXITCODE;if(`$null-eq`$code){`$code=1}
}catch{Write-Host ('Installer error: '+`$_.Exception.Message) -ForegroundColor Red;`$code=1}finally{if(Test-Path `$work){Remove-Item `$work -Recurse -Force -ErrorAction SilentlyContinue}}
exit `$code
"@
  $encoded=[Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($bootstrap));$wrapped=($base64 -split '(.{1,120})'|Where-Object{$_})-join[Environment]::NewLine;$cmd="@echo off`r`nsetlocal`r`nset `"GRMETRO_SELF=%~f0`"`r`npowershell.exe -NoProfile -ExecutionPolicy Bypass -EncodedCommand $encoded`r`nset `"GRMETRO_EXIT=%ERRORLEVEL%`"`r`necho.`r`necho GRMetro installer exited with code %GRMETRO_EXIT%.`r`npause`r`nexit /b %GRMETRO_EXIT%`r`n::GRMETRO_PAYLOAD_BEGIN::`r`n$wrapped`r`n"
  New-Item -ItemType Directory -Force -Path ([IO.Path]::GetDirectoryName($output))|Out-Null;[IO.File]::WriteAllText($output,$cmd,(New-Object Text.UTF8Encoding($false)))
  [pscustomobject]@{Output=$output;Bytes=(Get-Item $output).Length;Sha256=(Get-FileHash $output -Algorithm SHA256).Hash;ReleaseVersion=$ReleaseVersion;ApplicationCommit=[string]$identity.commit;ApplicationSha256=$applicationHash;UpdateHostSha256=$hostHash;ReviewSha256=$reviewHash;PayloadSha256=$payloadHash}|ConvertTo-Json -Depth 3
}finally{if(Test-Path $work){Remove-Item $work -Recurse -Force -ErrorAction SilentlyContinue}}
