# Provider-independent signed HTTPS release feed for the external Update Host.
# Loading this file performs no network, update, or state operation.

function Assert-GrMetroUpdaterOwnedRoot([string]$Root,[switch]$AllowTestRoot) {
  $resolved=[IO.Path]::GetFullPath($Root).TrimEnd('\')
  if(-not$AllowTestRoot){
    $expected=[IO.Path]::GetFullPath((Join-Path $env:LOCALAPPDATA 'GRMetro\Update State')).TrimEnd('\')
    if($resolved -ne $expected){throw 'Updater state path is not the protected GRMetro Update State directory.'}
  }
  $current=$resolved
  while($current){if(Test-Path -LiteralPath $current){if((Get-Item -LiteralPath $current -Force).Attributes-band[IO.FileAttributes]::ReparsePoint){throw 'Updater state path contains a reparse point.'}};$current=[IO.Path]::GetDirectoryName($current)}
  return $resolved
}

function Get-GrMetroUpdaterChildPath([string]$Root,[string]$Name) {
  if($Name -notmatch '^[A-Za-z0-9._-]{1,100}$'){throw 'Unsafe updater-owned filename.'}
  $base=[IO.Path]::GetFullPath($Root).TrimEnd('\');$path=[IO.Path]::GetFullPath((Join-Path $base $Name))
  if(-not$path.StartsWith($base+'\',[StringComparison]::OrdinalIgnoreCase)){throw 'Updater-owned path escaped its root.'}
  return $path
}

function Remove-GrMetroAbandonedUpdaterFiles([string]$StateRoot,[switch]$AllowTestRoot,[DateTime]$Now=([DateTime]::UtcNow)) {
  $root=Assert-GrMetroUpdaterOwnedRoot $StateRoot -AllowTestRoot:$AllowTestRoot
  foreach($file in @(Get-ChildItem -LiteralPath $root -File -Filter 'operation-*.json' -ErrorAction SilentlyContinue)){if($file.Attributes-band[IO.FileAttributes]::ReparsePoint){continue};if($file.LastWriteTimeUtc-lt$Now.AddDays(-7)){Remove-Item -LiteralPath $file.FullName -Force}}
  $cache=Join-Path $root 'Cache';if(Test-Path -LiteralPath $cache -PathType Container){if((Get-Item -LiteralPath $cache -Force).Attributes-band[IO.FileAttributes]::ReparsePoint){throw 'Updater cache is a reparse point.'};foreach($file in @(Get-ChildItem -LiteralPath $cache -File -Filter '*.partial' -ErrorAction SilentlyContinue)){if($file.Attributes-band[IO.FileAttributes]::ReparsePoint){continue};if($file.LastWriteTimeUtc-lt$Now.AddDays(-1)){Remove-Item -LiteralPath $file.FullName -Force}}}
}

function Read-GrMetroReleaseSource([string]$Path,[switch]$AllowInsecureTestTransport) {
  if(-not(Test-Path -LiteralPath $Path -PathType Leaf)){throw 'GRMetro release source configuration is missing.'}
  $config=Get-Content -LiteralPath $Path -Raw|ConvertFrom-Json
  if([int]$config.schemaVersion-ne1){throw 'Unsupported release source schema.'}
  if($config.enabled-ne$true){return [pscustomobject]@{Enabled=$false}}
  if([string]$config.channel-notin@('stable','testing')){throw 'Release source channel must be stable or testing.'}
  $hosts=@($config.allowedHosts);if(-not$hosts -or $hosts.Count-gt20){throw 'Release source requires an approved host allowlist.'}
  foreach($hostName in $hosts){if([string]$hostName-notmatch '^[A-Za-z0-9.-]{1,253}$' -or [string]$hostName-match '^\.|\.$|\.\.' -or (([string]$hostName-match '^localhost$|^127\.|^\[?::1\]?$')-and-not$AllowInsecureTestTransport)){throw "Invalid approved release host: $hostName"}}
  foreach($field in @('connectionTimeoutSeconds','responseTimeoutSeconds','maximumMetadataBytes','maximumArtifactBytes','maximumRedirects')){if(-not([Int64]$config.$field -ge 1)){throw "Invalid release source setting: $field"}}
  if([int]$config.connectionTimeoutSeconds-gt60-or[int]$config.responseTimeoutSeconds-gt300-or[Int64]$config.maximumMetadataBytes-gt1048576-or[Int64]$config.maximumArtifactBytes-gt1073741824-or[int]$config.maximumRedirects-gt5){throw 'Release source limits exceed the updater safety policy.'}
  $result=[pscustomobject]@{
    Enabled=$true;MetadataUrl=[string]$config.metadataUrl;SignatureUrl=[string]$config.signatureUrl;Channel=[string]$config.channel;AllowedHosts=$hosts
    ConnectionTimeoutSeconds=[int]$config.connectionTimeoutSeconds;ResponseTimeoutSeconds=[int]$config.responseTimeoutSeconds
    MaximumMetadataBytes=[Int64]$config.maximumMetadataBytes;MaximumArtifactBytes=[Int64]$config.maximumArtifactBytes;MaximumRedirects=[int]$config.maximumRedirects
  }
  $null=Assert-GrMetroReleaseUri $result.MetadataUrl $result.AllowedHosts -AllowInsecureTestTransport:$AllowInsecureTestTransport
  $null=Assert-GrMetroReleaseUri $result.SignatureUrl $result.AllowedHosts -AllowInsecureTestTransport:$AllowInsecureTestTransport
  return $result
}

function Assert-GrMetroReleaseUri([string]$Value,[string[]]$AllowedHosts,[switch]$AllowInsecureTestTransport) {
  $uri=$null;if(-not[Uri]::TryCreate($Value,[UriKind]::Absolute,[ref]$uri)){throw 'Release URL must be absolute.'}
  if($uri.IsUnc-or$uri.Scheme-in@('file','ftp')-or$uri.UserInfo){throw 'Release URL uses a forbidden path, scheme, or embedded credential.'}
  if($uri.Scheme-ne'https' -and -not($AllowInsecureTestTransport-and$uri.Scheme-eq'http'-and$uri.Host-in@('127.0.0.1','localhost'))){throw 'Remote releases require HTTPS.'}
  if($uri.Host-notin$AllowedHosts){throw "Release URL host is not approved: $($uri.Host)"}
  return $uri
}

function Invoke-GrMetroHttpBytes {
  param([string]$Uri,$Source,[Int64]$MaximumBytes,[switch]$AllowInsecureTestTransport)
  Add-Type -AssemblyName System.Net.Http
  $handler=New-Object Net.Http.HttpClientHandler;$handler.AllowAutoRedirect=$false
  $client=New-Object Net.Http.HttpClient($handler);$client.Timeout=[TimeSpan]::FromSeconds($Source.ResponseTimeoutSeconds)
  $client.DefaultRequestHeaders.UserAgent.ParseAdd('GRMetro-UpdateHost/1')
  try{
    $current=Assert-GrMetroReleaseUri $Uri $Source.AllowedHosts -AllowInsecureTestTransport:$AllowInsecureTestTransport
    for($redirect=0;$redirect-le$Source.MaximumRedirects;$redirect++){
      try{$requestTask=$client.GetAsync($current,[Net.Http.HttpCompletionOption]::ResponseHeadersRead);if(-not$requestTask.Wait([TimeSpan]::FromSeconds($Source.ConnectionTimeoutSeconds))){throw 'Release connection timed out.'};$response=$requestTask.GetAwaiter().GetResult()}catch{throw "Release request failed: $($_.Exception.GetBaseException().Message)"}
      try{
        if([int]$response.StatusCode-in@(301,302,303,307,308)){
          if($redirect-ge$Source.MaximumRedirects){throw 'Release request exceeded the redirect limit.'}
          $location=$response.Headers.Location;if(-not$location){throw 'Release redirect omitted its destination.'}
          $next=if($location.IsAbsoluteUri){$location}else{New-Object Uri($current,$location)}
          $current=Assert-GrMetroReleaseUri $next.AbsoluteUri $Source.AllowedHosts -AllowInsecureTestTransport:$AllowInsecureTestTransport
          continue
        }
        if(-not$response.IsSuccessStatusCode){throw "Release request returned HTTP $([int]$response.StatusCode)."}
        $length=$response.Content.Headers.ContentLength;if($null-ne$length-and[Int64]$length-gt$MaximumBytes){throw 'Release response exceeds its maximum allowed size.'}
        $stream=$response.Content.ReadAsStreamAsync().GetAwaiter().GetResult();if($stream.CanTimeout){$stream.ReadTimeout=$Source.ResponseTimeoutSeconds*1000};$memory=New-Object IO.MemoryStream;$deadline=[DateTime]::UtcNow.AddSeconds($Source.ResponseTimeoutSeconds)
        try{$buffer=New-Object byte[] 65536;$total=[Int64]0;while(($count=$stream.Read($buffer,0,$buffer.Length))-gt0){if([DateTime]::UtcNow-gt$deadline){throw 'Release response timed out.'};$total+=$count;if($total-gt$MaximumBytes){throw 'Release response exceeds its maximum allowed size.'};$memory.Write($buffer,0,$count)};if($null-ne$length-and$total-ne[Int64]$length){throw 'Release response was truncated.'};return $memory.ToArray()}finally{$stream.Dispose();$memory.Dispose()}
      }finally{$response.Dispose()}
    }
  }finally{$client.Dispose();$handler.Dispose()}
}

function Get-GrMetroPinnedReleaseKeys([string]$Path,[switch]$AllowTestKeys) {
  if(-not(Test-Path -LiteralPath $Path -PathType Leaf)){throw 'Pinned release public-key file is missing.'}
  $document=Get-Content -LiteralPath $Path -Raw|ConvertFrom-Json
  if([int]$document.schemaVersion-ne1){throw 'Unsupported pinned release-key schema.'}
  $keys=@{};foreach($item in @($document.keys)){
    $id=[string]$item.keyId;if($id-notmatch'^[A-Za-z0-9._-]{1,64}$'-or$keys.ContainsKey($id)){throw 'Pinned release key ID is invalid or duplicated.'}
    if($item.testOnly-eq$true-and-not$AllowTestKeys){throw "Test-only release key is forbidden in production: $id"}
    $allowedChannels=@($item.allowedChannels);if(-not$allowedChannels-or$allowedChannels.Count-gt2-or@($allowedChannels|Where-Object{$_-notin@('stable','testing')}).Count){throw "Pinned release key channel scope is invalid: $id"}
    if([string]$item.algorithm-ne'RSA-SHA256'){throw "Unsupported release signature algorithm for key $id."}
    $xml=[string]$item.publicKeyXml;if($xml-notmatch'^<RSAKeyValue>'){throw "Pinned release public key is invalid: $id"};$probe=New-Object Security.Cryptography.RSACryptoServiceProvider;try{$probe.PersistKeyInCsp=$false;$probe.FromXmlString($xml);if($probe.KeySize-lt3072-and-not$AllowTestKeys){throw "Pinned production release key must be at least RSA-3072: $id"}}finally{$probe.Dispose()}
    if($item.fingerprintSha256){$fingerprint=(Get-GrMetroPublicKeyFingerprint $xml);if(([string]$item.fingerprintSha256).ToUpperInvariant()-ne$fingerprint){throw "Pinned release key fingerprint mismatch: $id"}}
    $keys[$id]=[pscustomobject]@{PublicKeyXml=$xml;AllowedChannels=$allowedChannels;TestOnly=[bool]$item.testOnly}
  };return $keys
}

function Assert-GrMetroProvisionedKeyFingerprints([string]$Path) {
  $document=Get-Content -LiteralPath $Path -Raw|ConvertFrom-Json
  if(-not$document.keys){throw 'Provisioned public-key file is empty.'}
  foreach($item in @($document.keys)){if([string]$item.fingerprintSha256-notmatch'^[A-Fa-f0-9]{64}$'){throw "Provisioned public key requires a SHA-256 fingerprint: $($item.keyId)"};if(([string]$item.fingerprintSha256).ToUpperInvariant()-ne(Get-GrMetroPublicKeyFingerprint ([string]$item.publicKeyXml))){throw "Provisioned public-key fingerprint mismatch: $($item.keyId)"}}
}

function Test-GrMetroReleaseSignature([byte[]]$MetadataBytes,[byte[]]$SignatureBytes,[string]$PublicKeyXml) {
  $rsa=New-Object Security.Cryptography.RSACryptoServiceProvider
  try{$rsa.PersistKeyInCsp=$false;$rsa.FromXmlString($PublicKeyXml);return $rsa.VerifyData($MetadataBytes,[Security.Cryptography.CryptoConfig]::MapNameToOID('SHA256'),$SignatureBytes)}finally{$rsa.Dispose()}
}

function Get-GrMetroPublicKeyFingerprint([string]$PublicKeyXml) {
  $rsa=New-Object Security.Cryptography.RSACryptoServiceProvider
  try{$rsa.PersistKeyInCsp=$false;$rsa.FromXmlString($PublicKeyXml);$normalized=$rsa.ToXmlString($false)}finally{$rsa.Dispose()}
  $bytes=(New-Object Text.UTF8Encoding $false).GetBytes($normalized);$sha=[Security.Cryptography.SHA256]::Create();try{return ([BitConverter]::ToString($sha.ComputeHash($bytes))).Replace('-','')}finally{$sha.Dispose()}
}

function ConvertFrom-GrMetroSignedReleaseMetadata([byte[]]$MetadataBytes,[byte[]]$SignatureDocumentBytes,[hashtable]$PinnedKeys) {
  if(-not$MetadataBytes-or-not$SignatureDocumentBytes){throw 'Signed release metadata is empty.'}
  $utf8=New-Object Text.UTF8Encoding($false,$true)
  try{$metadataText=$utf8.GetString($MetadataBytes);$untrusted=$metadataText|ConvertFrom-Json}catch{throw 'Release metadata is malformed or not valid UTF-8 JSON.'}
  $keyId=[string]$untrusted.keyId
  if($keyId-notmatch'^[A-Za-z0-9._-]{1,64}$'-or-not$PinnedKeys.ContainsKey($keyId)){throw 'Release metadata uses an unknown signing key.'}
  try{$signatureText=$utf8.GetString($SignatureDocumentBytes);$signatureDocument=$signatureText|ConvertFrom-Json;$signature=[Convert]::FromBase64String([string]$signatureDocument.signature)}catch{throw 'Detached release signature is malformed.'}
  if([int]$signatureDocument.schemaVersion-ne1-or[string]$signatureDocument.keyId-ne$keyId-or[string]$signatureDocument.algorithm-ne'RSA-SHA256'){throw 'Detached release signature descriptor is invalid.'}
  $key=$PinnedKeys[$keyId]
  if(-not(Test-GrMetroReleaseSignature $MetadataBytes $signature ([string]$key.PublicKeyXml))){throw 'Release metadata signature verification failed.'}
  if([string]$untrusted.channel-notin@($key.AllowedChannels)){throw 'Release signing key is not authorized for this channel.'}
  return $untrusted
}

function Read-GrMetroUpdateTrustState([string]$StateRoot,[switch]$AllowTestRoot) {
  $root=Assert-GrMetroUpdaterOwnedRoot $StateRoot -AllowTestRoot:$AllowTestRoot;$path=Get-GrMetroUpdaterChildPath $root 'trust-state.json'
  if(-not(Test-Path -LiteralPath $path -PathType Leaf)){return [pscustomobject]@{schemaVersion=1;highestTrustedSequence=[Int64]0;identities=[pscustomobject]@{}}}
  try{$state=Get-Content -LiteralPath $path -Raw|ConvertFrom-Json}catch{throw 'Updater trust state is corrupt.'}
  if([int]$state.schemaVersion-ne1-or[Int64]$state.highestTrustedSequence-lt0-or$null-eq$state.identities){throw 'Updater trust state is invalid.'}
  return $state
}

function Write-GrMetroUpdateTrustState([string]$StateRoot,$State,[switch]$AllowTestRoot) {
  $root=Assert-GrMetroUpdaterOwnedRoot $StateRoot -AllowTestRoot:$AllowTestRoot;New-Item -ItemType Directory -Force -Path $root|Out-Null
  $path=Get-GrMetroUpdaterChildPath $root 'trust-state.json';$temporary=$path+'.tmp'
  [IO.File]::WriteAllText($temporary,(($State|ConvertTo-Json -Depth 6)+[Environment]::NewLine),(New-Object Text.UTF8Encoding $false));Move-Item -LiteralPath $temporary -Destination $path -Force
}

function Test-GrMetroTrustedReleaseMetadata($Metadata,$Source,$Installed,$TrustState,[switch]$AllowInsecureTestTransport) {
  if([int]$Metadata.schemaVersion-ne1){throw 'Unsupported signed release metadata schema.'}
  $version=[string]$Metadata.releaseVersion
  if($version-eq'0.0.0.0'){throw 'Development releases cannot be offered as production updates.'}
  $identity=ConvertTo-GrMetroReleaseVersion $version
  if([Int64]$Metadata.releaseSequence-ne$identity.ReleaseSequence){throw 'Release sequence does not match its CalVer identity.'}
  if([string]$Metadata.channel-ne$Source.Channel){throw 'Release channel does not match the configured update channel.'}
  $digest=([string]$Metadata.artifactSha256).ToUpperInvariant();if($digest-notmatch'^[A-F0-9]{64}$'){throw 'Release artifact SHA-256 is invalid.'}
  $size=[Int64]$Metadata.artifactSize;if($size-lt1-or$size-gt$Source.MaximumArtifactBytes){throw 'Release artifact size is invalid or exceeds policy.'}
  $notes=@($Metadata.releaseNotes);if($notes.Count-gt100-or@($notes|Where-Object{$_-isnot[string]}).Count-or(($notes-join"`n").Length)-gt20000){throw 'Release notes are invalid or too large.'}
  try{$published=[DateTimeOffset]::Parse([string]$Metadata.publishedAt)}catch{throw 'Release publication timestamp is invalid.'}
  $artifactUri=Assert-GrMetroReleaseUri ([string]$Metadata.artifactUrl) $Source.AllowedHosts -AllowInsecureTestTransport:$AllowInsecureTestTransport
  $minimumProtocol=[int]$Metadata.minimumUpdaterProtocol;if($minimumProtocol-lt1){throw 'Minimum updater protocol is invalid.'}
  $authenticodeRequired=if($null-eq$Metadata.authenticodeRequired){$false}elseif($Metadata.authenticodeRequired-is[bool]){[bool]$Metadata.authenticodeRequired}else{throw 'Authenticode release policy is invalid.'}
  $known=$TrustState.identities.PSObject.Properties[$version]
  if($known-and[string]$known.Value-ne$digest){throw 'A trusted release identity was reused with a different artifact digest.'}
  if([Int64]$Metadata.releaseSequence-lt[Int64]$TrustState.highestTrustedSequence){throw 'Signed release metadata is older than the highest trusted release sequence.'}
  $current=ConvertTo-GrMetroReleaseVersion ([string]$Installed.releaseVersion) -AllowDevelopment:([string]$Installed.channel-eq'development')
  $available=$identity.ReleaseSequence-gt$current.ReleaseSequence-and[Int64]$Metadata.releaseSequence-gt[Int64]$Installed.releaseSequence
  return [pscustomobject]@{Version=$identity.ReleaseVersion;Sequence=$identity.ReleaseSequence;Digest=$digest;Size=$size;Notes=$notes;PublishedAt=$published;ArtifactUri=$artifactUri;MinimumUpdaterProtocol=$minimumProtocol;AuthenticodeRequired=$authenticodeRequired;Available=$available}
}

function Get-GrMetroReleaseCheck {
  param([string]$InstallRoot,[string]$StateRoot,[string]$ReleaseSourcePath,[string]$PublicKeysPath,[int]$UpdaterProtocol=1,[switch]$AllowInsecureTestTransport,[switch]$AllowTestRoot,[switch]$ReadOnly)
  $source=Read-GrMetroReleaseSource $ReleaseSourcePath -AllowInsecureTestTransport:$AllowInsecureTestTransport
  $installed=Get-GrMetroInstalledReleaseMetadata $InstallRoot
  if(-not$source.Enabled){return [pscustomobject]@{status='not-configured';updateAvailable=$false;current=[string]$installed.releaseVersion;message='Remote release source is not configured.'}}
  $metadataUri=Assert-GrMetroReleaseUri $source.MetadataUrl $source.AllowedHosts -AllowInsecureTestTransport:$AllowInsecureTestTransport
  $signatureUri=Assert-GrMetroReleaseUri $source.SignatureUrl $source.AllowedHosts -AllowInsecureTestTransport:$AllowInsecureTestTransport
  $metadataBytes=Invoke-GrMetroHttpBytes $metadataUri.AbsoluteUri $source $source.MaximumMetadataBytes -AllowInsecureTestTransport:$AllowInsecureTestTransport
  $signatureBytes=Invoke-GrMetroHttpBytes $signatureUri.AbsoluteUri $source 16384 -AllowInsecureTestTransport:$AllowInsecureTestTransport
  $keys=Get-GrMetroPinnedReleaseKeys $PublicKeysPath -AllowTestKeys:$AllowTestRoot
  $metadata=ConvertFrom-GrMetroSignedReleaseMetadata $metadataBytes $signatureBytes $keys
  $trust=Read-GrMetroUpdateTrustState $StateRoot -AllowTestRoot:$AllowTestRoot
  $trusted=Test-GrMetroTrustedReleaseMetadata $metadata $source $installed $trust -AllowInsecureTestTransport:$AllowInsecureTestTransport
  if(-not$ReadOnly){
    if([Int64]$metadata.releaseSequence-gt[Int64]$trust.highestTrustedSequence){$trust.highestTrustedSequence=[Int64]$metadata.releaseSequence}
    $identities=[ordered]@{};foreach($property in @($trust.identities.PSObject.Properties|Sort-Object Name|Select-Object -Last 49)){$identities[$property.Name]=[string]$property.Value};$identities[$trusted.Version]=$trusted.Digest;$trust.identities=[pscustomobject]$identities
    Write-GrMetroUpdateTrustState $StateRoot $trust -AllowTestRoot:$AllowTestRoot
  }
  if($trusted.MinimumUpdaterProtocol-gt$UpdaterProtocol){return [pscustomobject]@{status='requires-setup';updateAvailable=$false;current=[string]$installed.releaseVersion;latest=$trusted.Version;message='This update requires a newer GRMetro Setup.';metadata=$metadata;source=$source}}
  $summary=if($trusted.Notes.Count){[string]$trusted.Notes[0]}else{'A newer GRMetro release is available.'}
  return [pscustomobject]@{status=$(if($trusted.Available){'available'}else{'up-to-date'});updateAvailable=[bool]$trusted.Available;current=[string]$installed.releaseVersion;latest=$trusted.Version;summary=$summary;releaseNotes=$trusted.Notes;artifactUrl=$trusted.ArtifactUri.AbsoluteUri;artifactSize=$trusted.Size;artifactSha256=$trusted.Digest;releaseSequence=$trusted.Sequence;minimumUpdaterProtocol=$trusted.MinimumUpdaterProtocol;authenticodeRequired=$trusted.AuthenticodeRequired;metadata=$metadata;source=$source}
}

function Receive-GrMetroVerifiedReleasePackage {
  param($Release,[string]$StateRoot,[switch]$AllowInsecureTestTransport,[switch]$AllowTestRoot,[scriptblock]$ProgressAction=$null)
  if(-not$Release.updateAvailable){throw 'No verified update is available for download.'}
  $root=Assert-GrMetroUpdaterOwnedRoot $StateRoot -AllowTestRoot:$AllowTestRoot;$cache=Join-Path $root 'Cache';New-Item -ItemType Directory -Force -Path $cache|Out-Null
  if((Get-Item -LiteralPath $cache -Force).Attributes-band[IO.FileAttributes]::ReparsePoint){throw 'Updater cache is a reparse point.'}
  $name='GRMetro-'+([string]$Release.latest).Replace('.','-')+'.zip';$final=Get-GrMetroUpdaterChildPath $cache $name;$partial=$final+'.partial'
  if(Test-Path -LiteralPath $partial){Remove-Item -LiteralPath $partial -Force}
  Add-Type -AssemblyName System.Net.Http
  $source=$Release.source;$handler=New-Object Net.Http.HttpClientHandler;$handler.AllowAutoRedirect=$false;$client=New-Object Net.Http.HttpClient($handler);$client.Timeout=[TimeSpan]::FromSeconds($source.ResponseTimeoutSeconds)
  try{
    $current=Assert-GrMetroReleaseUri $Release.artifactUrl $source.AllowedHosts -AllowInsecureTestTransport:$AllowInsecureTestTransport
    for($redirect=0;$redirect-le$source.MaximumRedirects;$redirect++){
      $requestTask=$client.GetAsync($current,[Net.Http.HttpCompletionOption]::ResponseHeadersRead);if(-not$requestTask.Wait([TimeSpan]::FromSeconds($source.ConnectionTimeoutSeconds))){throw 'Artifact connection timed out.'};$response=$requestTask.GetAwaiter().GetResult()
      try{
        if([int]$response.StatusCode-in@(301,302,303,307,308)){if($redirect-ge$source.MaximumRedirects){throw 'Artifact download exceeded redirect limit.'};$location=$response.Headers.Location;if(-not$location){throw 'Artifact redirect omitted its destination.'};$current=Assert-GrMetroReleaseUri $(if($location.IsAbsoluteUri){$location.AbsoluteUri}else{(New-Object Uri($current,$location)).AbsoluteUri}) $source.AllowedHosts -AllowInsecureTestTransport:$AllowInsecureTestTransport;continue}
        if(-not$response.IsSuccessStatusCode){throw "Artifact download returned HTTP $([int]$response.StatusCode)."}
        $length=$response.Content.Headers.ContentLength;if($null-ne$length-and[Int64]$length-ne[Int64]$Release.artifactSize){throw 'Artifact Content-Length does not match signed metadata.'}
        $stream=$response.Content.ReadAsStreamAsync().GetAwaiter().GetResult();if($stream.CanTimeout){$stream.ReadTimeout=$source.ResponseTimeoutSeconds*1000};$file=New-Object IO.FileStream($partial,[IO.FileMode]::CreateNew,[IO.FileAccess]::Write,[IO.FileShare]::None);$deadline=[DateTime]::UtcNow.AddSeconds($source.ResponseTimeoutSeconds)
        try{$buffer=New-Object byte[] 65536;$total=[Int64]0;while(($count=$stream.Read($buffer,0,$buffer.Length))-gt0){if([DateTime]::UtcNow-gt$deadline){throw 'Artifact download timed out.'};$total+=$count;if($total-gt[Int64]$Release.artifactSize-or$total-gt$source.MaximumArtifactBytes){throw 'Artifact download exceeded its signed or configured size.'};$file.Write($buffer,0,$count);if($ProgressAction){&$ProgressAction $total ([Int64]$Release.artifactSize)}}}finally{$file.Dispose();$stream.Dispose()}
        if($total-ne[Int64]$Release.artifactSize){throw 'Artifact download was truncated.'}
        $hash=(Get-FileHash -LiteralPath $partial -Algorithm SHA256).Hash;if($hash-ne[string]$Release.artifactSha256){throw 'Artifact SHA-256 does not match signed release metadata.'}
        if(Test-Path -LiteralPath $final){Remove-Item -LiteralPath $final -Force};Move-Item -LiteralPath $partial -Destination $final
        foreach($old in @(Get-ChildItem -LiteralPath $cache -File -Filter 'GRMetro-*.zip'|Sort-Object LastWriteTimeUtc -Descending|Select-Object -Skip 3)){if(-not($old.Attributes-band[IO.FileAttributes]::ReparsePoint)){Remove-Item -LiteralPath $old.FullName -Force}}
        return $final
      }finally{$response.Dispose()}
    }
  }catch{if(Test-Path -LiteralPath $partial){Remove-Item -LiteralPath $partial -Force -ErrorAction SilentlyContinue};throw}finally{$client.Dispose();$handler.Dispose()}
}
