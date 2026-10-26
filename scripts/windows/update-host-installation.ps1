# Transactional installation for the external, non-replaceable Update Host.
# Loading this file performs no filesystem, process, network, or Windows integration changes.

function Get-GrMetroStableUpdateHostPaths {
  $parent=[IO.Path]::GetFullPath((Join-Path $env:LOCALAPPDATA 'GRMetro')).TrimEnd('\')
  $destination=[IO.Path]::GetFullPath((Join-Path $parent 'Update Host')).TrimEnd('\')
  $backup=[IO.Path]::GetFullPath((Join-Path $parent 'Update Host.previous')).TrimEnd('\')
  $stateRoot=[IO.Path]::GetFullPath((Join-Path $parent 'Update State')).TrimEnd('\')
  foreach($path in @($parent,$destination,$backup,$stateRoot)){
    if($path-ne$parent-and-not$path.StartsWith($parent+'\',[StringComparison]::OrdinalIgnoreCase)){throw 'GRMetro Update Host path escaped its protected root.'}
    $current=$path
    while($current){if(Test-Path -LiteralPath $current){if((Get-Item -LiteralPath $current -Force).Attributes-band[IO.FileAttributes]::ReparsePoint){throw 'GRMetro Update Host path contains a reparse point.'}};$current=[IO.Path]::GetDirectoryName($current)}
  }
  return [pscustomobject]@{Parent=$parent;Destination=$destination;Backup=$backup;StateRoot=$stateRoot;SourceConfig=(Join-Path $stateRoot 'release-source.json')}
}

function Install-GrMetroStableUpdateHost([string]$BundlePath,[scriptblock]$SourceInstallAction={param($source,$destination)Copy-Item -LiteralPath $source -Destination $destination -Force}) {
  if(-not$BundlePath){throw 'The GRMetro Update Host bundle is required.'}
  if(-not(Test-Path -LiteralPath $BundlePath -PathType Leaf)){throw 'The GRMetro Update Host bundle is missing.'}
  Add-Type -AssemblyName System.IO.Compression.FileSystem
  $paths=Get-GrMetroStableUpdateHostPaths
  if(Test-Path -LiteralPath $paths.Backup){throw 'A previous GRMetro Update Host backup already exists and must be preserved for recovery.'}
  $stage=Join-Path $paths.Parent ('Update Host.installing-'+[guid]::NewGuid().ToString('N'))
  $hadPrevious=Test-Path -LiteralPath $paths.Destination -PathType Container
  $sourceExisted=Test-Path -LiteralPath $paths.SourceConfig -PathType Leaf;$sourceBytes=if($sourceExisted){[IO.File]::ReadAllBytes($paths.SourceConfig)}else{$null}
  $published=$false;$sourceChanged=$false
  New-Item -ItemType Directory -Force -Path $paths.Parent,$stage|Out-Null
  try{
    $archive=[IO.Compression.ZipFile]::OpenRead([IO.Path]::GetFullPath($BundlePath))
    try{
      $allowed=@('GRMetro Update Host.exe','update-host.ps1','package-files.ps1','process-control.ps1','application-validation.ps1','release-identity.ps1','release-feed.ps1','authenticode-signing.ps1','release-source.default.json','release-public-keys.json','provisioning-policy.json');$seen=@{}
      foreach($entry in $archive.Entries){
        $relative=$entry.FullName.Replace('\','/')
        if([string]::IsNullOrWhiteSpace($entry.Name)-or$relative-notin$allowed-or$seen.ContainsKey($relative)){throw "Unexpected Update Host entry: $relative"}
        $target=[IO.Path]::GetFullPath((Join-Path $stage $relative));if([IO.Path]::GetDirectoryName($target)-ne[IO.Path]::GetFullPath($stage).TrimEnd('\')){throw 'Update Host entry escaped its installation root.'}
        [IO.Compression.ZipFileExtensions]::ExtractToFile($entry,$target,$false);$seen[$relative]=$true
      }
      foreach($required in $allowed){if(-not$seen.ContainsKey($required)){throw "Update Host entry missing: $required"}}
    }finally{$archive.Dispose()}
    $policy=Get-Content -LiteralPath (Join-Path $stage 'provisioning-policy.json') -Raw|ConvertFrom-Json
    if([int]$policy.schemaVersion-ne1-or[int]$policy.updaterProtocol-lt1-or$policy.applyOnSetup-isnot[bool]){throw 'Update Host provisioning policy is invalid.'}
    . (Join-Path $stage 'release-feed.ps1')
    $source=Read-GrMetroReleaseSource (Join-Path $stage 'release-source.default.json')
    $keys=Get-GrMetroPinnedReleaseKeys (Join-Path $stage 'release-public-keys.json')
    if($policy.applyOnSetup-eq$true-and(-not$source.Enabled-or$keys.Count-lt1)){throw 'Update trust provisioning requires an enabled release source and at least one public key.'}
    if($policy.applyOnSetup-eq$true){Assert-GrMetroProvisionedKeyFingerprints (Join-Path $stage 'release-public-keys.json')}
    if($policy.applyOnSetup-ne$true-and($source.Enabled-or$keys.Count-ne0)){throw 'Nonprovisioning Update Host bundles must retain disabled feed and empty key defaults.'}
    if($hadPrevious){Move-Item -LiteralPath $paths.Destination -Destination $paths.Backup}
    try{Move-Item -LiteralPath $stage -Destination $paths.Destination;$published=$true}catch{if((Test-Path -LiteralPath $paths.Backup)-and-not(Test-Path -LiteralPath $paths.Destination)){Move-Item -LiteralPath $paths.Backup -Destination $paths.Destination};throw}
    if($policy.applyOnSetup-ne$true-and(Test-Path -LiteralPath (Join-Path $paths.Backup 'release-public-keys.json') -PathType Leaf)){$null=Get-GrMetroPinnedReleaseKeys (Join-Path $paths.Backup 'release-public-keys.json');Copy-Item -LiteralPath (Join-Path $paths.Backup 'release-public-keys.json') -Destination (Join-Path $paths.Destination 'release-public-keys.json') -Force}
    if($policy.applyOnSetup-eq$true-or-not$sourceExisted){New-Item -ItemType Directory -Force -Path $paths.StateRoot|Out-Null;$sourceChanged=$true;&$SourceInstallAction (Join-Path $paths.Destination 'release-source.default.json') $paths.SourceConfig}
    return [pscustomobject]@{Destination=$paths.Destination;Backup=$paths.Backup;HadPrevious=[bool]$hadPrevious;StateRoot=$paths.StateRoot;SourceConfig=$paths.SourceConfig;SourceExisted=[bool]$sourceExisted;SourceBytes=$sourceBytes;SourceChanged=$sourceChanged;ApplyOnSetup=[bool]$policy.applyOnSetup;UpdaterProtocol=[int]$policy.updaterProtocol;SourceChannel=[string]$source.Channel;HostExecutable=(Join-Path $paths.Destination 'GRMetro Update Host.exe')}
  }catch{
    $failure=$_
    if($published-and(Test-Path -LiteralPath $paths.Destination)){Remove-Item -LiteralPath $paths.Destination -Recurse -Force}
    if($hadPrevious-and(Test-Path -LiteralPath $paths.Backup)-and-not(Test-Path -LiteralPath $paths.Destination)){Move-Item -LiteralPath $paths.Backup -Destination $paths.Destination}
    if($sourceChanged){if($sourceExisted){[IO.File]::WriteAllBytes($paths.SourceConfig,[byte[]]$sourceBytes)}elseif(Test-Path -LiteralPath $paths.SourceConfig){Remove-Item -LiteralPath $paths.SourceConfig -Force;if((Test-Path -LiteralPath $paths.StateRoot)-and@(Get-ChildItem -LiteralPath $paths.StateRoot -Force).Count-eq0){Remove-Item -LiteralPath $paths.StateRoot -Force}}}
    throw $failure
  }finally{if(Test-Path -LiteralPath $stage){Remove-Item -LiteralPath $stage -Recurse -Force -ErrorAction SilentlyContinue}}
}

function Complete-GrMetroStableUpdateHost($State) {
  if($State-and(Test-Path -LiteralPath $State.Backup)){Remove-Item -LiteralPath $State.Backup -Recurse -Force}
}

function Restore-GrMetroStableUpdateHost($State) {
  if(-not$State){return}
  $paths=Get-GrMetroStableUpdateHostPaths
  if([IO.Path]::GetFullPath([string]$State.Destination).TrimEnd('\')-ne$paths.Destination-or[IO.Path]::GetFullPath([string]$State.Backup).TrimEnd('\')-ne$paths.Backup-or[IO.Path]::GetFullPath([string]$State.StateRoot).TrimEnd('\')-ne$paths.StateRoot-or[IO.Path]::GetFullPath([string]$State.SourceConfig)-ne$paths.SourceConfig){throw 'Update Host recovery state contains an unsafe path.'}
  if(Test-Path -LiteralPath $State.Destination){Remove-Item -LiteralPath $State.Destination -Recurse -Force}
  if($State.HadPrevious){if(-not(Test-Path -LiteralPath $State.Backup)){throw 'Previous GRMetro Update Host backup is missing.'};Move-Item -LiteralPath $State.Backup -Destination $State.Destination}
  if($State.SourceChanged){if($State.SourceExisted){[IO.File]::WriteAllBytes($State.SourceConfig,[byte[]]$State.SourceBytes)}elseif(Test-Path -LiteralPath $State.SourceConfig){Remove-Item -LiteralPath $State.SourceConfig -Force;if((Test-Path -LiteralPath $State.StateRoot)-and@(Get-ChildItem -LiteralPath $State.StateRoot -Force).Count-eq0){Remove-Item -LiteralPath $State.StateRoot -Force}}}
}
