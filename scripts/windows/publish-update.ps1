[CmdletBinding()]
param(
  [string]$SigningKeyPath=(Join-Path $env:USERPROFILE 'GRMetro-Signing\staging\grmetro-staging-2026-private.xml'),
  [string]$ReleasePublicKeysPath=(Join-Path $env:USERPROFILE 'GRMetro-Signing\staging\grmetro-staging-2026-public.json'),
  [string]$AuthenticodeRootCertificatePath=(Join-Path $env:USERPROFILE 'GRMetro-Signing\authenticode\public\grmetro-internal-code-signing-root-ca.cer'),
  [string]$ReleaseNotesPath,
  [string]$OutputRoot,
  [string]$Origin='https://grmetro-updates.grmetroheatingandcooling.workers.dev',
  [string]$Bucket='grmetro-updates',
  [string]$CloudflareAccountId='8d710ff406719195e28bff0bb5971269',
  [string]$KeyId='grmetro-staging-2026',
  [string]$WranglerVersion='4.161.0',
  [string]$ExpectedDevelopmentComputer='DESKTOP-06FFB59',
  [switch]$ConfirmPublish,
  [switch]$PlanOnly
)

$ErrorActionPreference='Stop'
$script:PublisherRoot=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..')).TrimEnd('\')
$script:PublisherSource=Join-Path $PSScriptRoot 'release-source.cloudflare-staging.json'
$script:PublisherPolicy=Join-Path $PSScriptRoot 'internal-authenticode-policy.json'
$script:PublisherWranglerVersion=$WranglerVersion
. (Join-Path $PSScriptRoot 'release-identity.ps1')
. (Join-Path $PSScriptRoot 'release-feed.ps1')
. (Join-Path $PSScriptRoot 'package-files.ps1')
. (Join-Path $PSScriptRoot 'authenticode-signing.ps1')

function Get-GrMetroNextStagingVersion {
  param([Parameter(Mandatory=$true)][string]$CurrentVersion,[DateTime]$Now=(Get-Date))
  $current=ConvertTo-GrMetroReleaseVersion $CurrentVersion
  $today=[DateTime]::new($Now.Year,$Now.Month,$Now.Day)
  $currentDate=[DateTime]::new($current.Year,$current.Month,$current.Day)
  if($currentDate-gt$today){throw "The published release date $currentDate is ahead of the development computer. Correct the clock before publishing."}
  $revision=if($currentDate-eq$today){$current.Revision+1}else{1}
  if($revision-gt9999){throw 'The daily release revision limit has been reached.'}
  return "$($today.Year).$($today.Month).$($today.Day).$revision"
}

function Get-GrMetroPublicationPlan {
  param([Parameter(Mandatory=$true)][string]$Version,[string]$BucketName='grmetro-updates',[string]$PublicOrigin='https://grmetro-updates.grmetroheatingandcooling.workers.dev')
  $null=ConvertTo-GrMetroReleaseVersion $Version
  $name="grmetro-performance-center-$Version.zip"
  return @(
    [pscustomobject]@{Order=1;Kind='zip';Key="staging/$name";Url="$PublicOrigin/staging/$name";ContentType='application/zip';CacheControl='public, max-age=31536000, immutable';Bucket=$BucketName},
    [pscustomobject]@{Order=2;Kind='signature';Key='staging/release.json.sig';Url="$PublicOrigin/staging/release.json.sig";ContentType='application/octet-stream';CacheControl='no-store';Bucket=$BucketName},
    [pscustomobject]@{Order=3;Kind='metadata';Key='staging/release.json';Url="$PublicOrigin/staging/release.json";ContentType='application/json; charset=utf-8';CacheControl='no-store';Bucket=$BucketName}
  )
}

function Test-GrMetroTransientNetworkError($ErrorRecord) {
  $exception=if($ErrorRecord -is [System.Management.Automation.ErrorRecord]){$ErrorRecord.Exception}else{$ErrorRecord}
  for($current=$exception;$current;$current=$current.InnerException){
    if($current -is [Net.WebException]-or$current -is [Net.Sockets.SocketException]-or$current.GetType().FullName-eq'System.Net.Http.HttpRequestException'){return $true}
  }
  $text=[string]$exception.Message
  return $text-match'(?i)(transport connection|forcibly closed|connection (?:reset|aborted|closed|timed out)|socket hang up|ECONNRESET|ECONNABORTED|ETIMEDOUT|EAI_AGAIN|network name is no longer available|temporary failure|timed out|timeout|HTTP (?:408|429|500|502|503|504)|status code (?:408|429|500|502|503|504)|error code: (?:408|429|500|502|503|504))'
}

function Invoke-GrMetroTransientNetworkOperation {
  param(
    [Parameter(Mandatory=$true)][string]$Stage,
    [Parameter(Mandatory=$true)][scriptblock]$Action,
    [int]$MaximumAttempts=4,[int]$InitialDelayMilliseconds=1000,
    [scriptblock]$SleepAction={param($milliseconds)Start-Sleep -Milliseconds $milliseconds}
  )
  if($MaximumAttempts-lt1-or$MaximumAttempts-gt6-or$InitialDelayMilliseconds-lt0-or$InitialDelayMilliseconds-gt30000){throw "Invalid transient retry policy for $Stage."}
  for($attempt=1;$attempt-le$MaximumAttempts;$attempt++){
    try{return &$Action}
    catch{
      $failure=$_
      if(-not(Test-GrMetroTransientNetworkError $failure)){throw "Publisher stage '$Stage' failed without retry: $($failure.Exception.Message)"}
      if($attempt-eq$MaximumAttempts){throw "Publisher stage '$Stage' failed after $attempt transient attempts: $($failure.Exception.Message)"}
      $delay=[int]($InitialDelayMilliseconds*[Math]::Pow(2,$attempt-1))
      Write-Warning "Publisher stage '$Stage' hit a transient network error on attempt $attempt/$MaximumAttempts. Retrying in $delay ms. $($failure.Exception.Message)"
      &$SleepAction $delay
    }
  }
}

function Invoke-GrMetroWrangler {
  param([Parameter(Mandatory=$true)][string[]]$Arguments,[switch]$AllowMissingObject,[switch]$RetryTransient,[string]$Stage='Cloudflare Wrangler command',[scriptblock]$SleepAction=$null)
  $invoke={
    $npx=(Get-Command npx.cmd -ErrorAction Stop).Source
    $wranglerRoot=Join-Path $env:LOCALAPPDATA 'GRMetro Release Publisher\Wrangler';New-Item -ItemType Directory -Force -Path $wranglerRoot|Out-Null
    $prior=$ErrorActionPreference;$ErrorActionPreference='Continue'
    try{$output=@(& $npx --yes "wrangler@$script:PublisherWranglerVersion" --cwd $wranglerRoot @Arguments 2>&1);$code=$LASTEXITCODE}finally{$ErrorActionPreference=$prior}
    $text=($output|ForEach-Object{$_.ToString()})-join[Environment]::NewLine
    if($code-ne0){
      if($AllowMissingObject-and$text-match'(?i)specified key does not exist'){return [pscustomobject]@{ExitCode=$code;Missing=$true;Output=$text}}
      throw "Cloudflare Wrangler failed (exit $code): $($text.Trim())"
    }
    return [pscustomobject]@{ExitCode=0;Missing=$false;Output=$text}
  }
  if(-not$RetryTransient){return &$invoke}
  $retry=@{Stage=$Stage;Action=$invoke};if($SleepAction){$retry.SleepAction=$SleepAction}
  return Invoke-GrMetroTransientNetworkOperation @retry
}

function Invoke-GrMetroHttpDownload {
  param([string]$Stage,[string]$Uri,[string]$OutFile,[int]$TimeoutSeconds,[scriptblock]$SleepAction=$null)
  $action={
    if(Test-Path -LiteralPath $OutFile){Remove-Item -LiteralPath $OutFile -Force}
    Invoke-WebRequest -UseBasicParsing -Uri $Uri -OutFile $OutFile -MaximumRedirection 0 -TimeoutSec $TimeoutSeconds
  }
  $retry=@{Stage=$Stage;Action=$action};if($SleepAction){$retry.SleepAction=$SleepAction}
  $null=Invoke-GrMetroTransientNetworkOperation @retry
}

function Get-GrMetroRemoteStagingRelease {
  param([Parameter(Mandatory=$true)][string]$PublicKeysPath,[string]$PublicOrigin=$Origin)
  $source=Read-GrMetroReleaseSource $script:PublisherSource
  if(-not$source.Enabled-or$source.Channel-ne'testing'-or$source.MetadataUrl-ne"$PublicOrigin/staging/release.json"-or$source.SignatureUrl-ne"$PublicOrigin/staging/release.json.sig"){
    throw 'The checked-in Cloudflare testing source does not match the approved staging origin.'
  }
  $temporary=Join-Path $env:TEMP ('grmetro-release-source-'+[guid]::NewGuid().ToString('N'))
  New-Item -ItemType Directory -Path $temporary|Out-Null
  try{
    $metadataPath=Join-Path $temporary 'release.json';$signaturePath=Join-Path $temporary 'release.json.sig'
    Invoke-GrMetroHttpDownload -Stage "read signed staging metadata $($source.MetadataUrl)" -Uri $source.MetadataUrl -OutFile $metadataPath -TimeoutSeconds $source.ResponseTimeoutSeconds
    Invoke-GrMetroHttpDownload -Stage "read signed staging signature $($source.SignatureUrl)" -Uri $source.SignatureUrl -OutFile $signaturePath -TimeoutSeconds $source.ResponseTimeoutSeconds
    $keys=Get-GrMetroPinnedReleaseKeys $PublicKeysPath
    $metadata=ConvertFrom-GrMetroSignedReleaseMetadata ([IO.File]::ReadAllBytes($metadataPath)) ([IO.File]::ReadAllBytes($signaturePath)) $keys
    if([string]$metadata.channel-ne'testing'){throw 'Published metadata is not on the testing channel.'}
    $identity=ConvertTo-GrMetroReleaseVersion ([string]$metadata.releaseVersion)
    if([Int64]$metadata.releaseSequence-ne$identity.ReleaseSequence){throw 'Published metadata release sequence does not match its CalVer identity.'}
    if([string]$metadata.artifactSha256-notmatch'^[A-F0-9]{64}$'-or[Int64]$metadata.artifactSize-lt1-or[int]$metadata.minimumUpdaterProtocol-lt1){throw 'Published metadata artifact or protocol identity is invalid.'}
    $uri=Assert-GrMetroReleaseUri ([string]$metadata.artifactUrl) @($source.AllowedHosts)
    if(-not$uri.AbsolutePath.StartsWith('/staging/',[StringComparison]::Ordinal)){throw 'Published testing artifact is outside the staging prefix.'}
    return [pscustomobject]@{Metadata=$metadata;Source=$source;MetadataSha256=(Get-FileHash $metadataPath -Algorithm SHA256).Hash;SignatureSha256=(Get-FileHash $signaturePath -Algorithm SHA256).Hash}
  }finally{Remove-Item -LiteralPath $temporary -Recurse -Force -ErrorAction SilentlyContinue}
}

function Test-GrMetroReleaseSigningMaterials {
  param([string]$PrivateKeyPath,[string]$PublicKeysPath,[string]$RootCertificatePath,[string]$ReleaseKeyId)
  foreach($path in @($PrivateKeyPath,$PublicKeysPath,$RootCertificatePath,$script:PublisherPolicy)){if(-not(Test-Path -LiteralPath $path -PathType Leaf)){throw "Required release signing file is missing: $path"}}
  $privateFull=[IO.Path]::GetFullPath($PrivateKeyPath)
  if($privateFull.StartsWith($script:PublisherRoot+'\',[StringComparison]::OrdinalIgnoreCase)){throw 'The RSA release private key must remain outside the repository.'}
  $policy=Read-GrMetroAuthenticodePolicy $script:PublisherPolicy
  $rootCertificate=Get-GrMetroPublicCertificate -Path $RootCertificatePath -ExpectedThumbprint $policy.RootCertificateThumbprint -ExpectedSubject $policy.RootCertificateSubject -ExpectedSha256 $policy.RootCertificateSha256
  $signer=Get-GrMetroCodeSigningCertificate $policy.SigningCertificateThumbprint
  $null=Assert-GrMetroCodeSigningCertificate -Certificate $signer -MinimumValidityDays $policy.MinimumValidityDays -ExpectedSubject $policy.SigningCertificateSubject
  $null=Assert-GrMetroPinnedCertificateChain -Certificate $signer -RootCertificate $rootCertificate
  $document=Get-Content -LiteralPath $PublicKeysPath -Raw|ConvertFrom-Json
  $public=@($document.keys|Where-Object{[string]$_.keyId-eq$ReleaseKeyId})
  if($public.Count-ne1-or[string]$public[0].algorithm-ne'RSA-SHA256'-or$public[0].testOnly-eq$true-or'testing'-notin@($public[0].allowedChannels)){throw 'The staging RSA public key policy is missing or ambiguous.'}
  $privateXml=Get-Content -LiteralPath $privateFull -Raw
  $rsa=New-Object Security.Cryptography.RSACryptoServiceProvider
  try{$rsa.PersistKeyInCsp=$false;$rsa.FromXmlString($privateXml);if($rsa.KeySize-lt3072){throw 'The staging RSA key must be at least 3072 bits.'};$derived=$rsa.ToXmlString($false)}finally{$rsa.Dispose()}
  $probe=New-Object Security.Cryptography.RSACryptoServiceProvider
  try{$probe.PersistKeyInCsp=$false;$probe.FromXmlString([string]$public[0].publicKeyXml);$expected=$probe.ToXmlString($false)}finally{$probe.Dispose()}
  if($derived-ne$expected-or(Get-GrMetroPublicKeyFingerprint $derived)-ne([string]$public[0].fingerprintSha256).ToUpperInvariant()){throw 'The staging RSA private key does not match the approved public key fingerprint.'}
  return [pscustomobject]@{Policy=$policy;Signer=$signer;RootCertificate=$rootCertificate;RootCertificatePath=[IO.Path]::GetFullPath($RootCertificatePath);KeyFingerprint=Get-GrMetroPublicKeyFingerprint $derived}
}

function Test-GrMetroReleaseRepository {
  param([string]$ExpectedComputer)
  if($ExpectedComputer-and$env:COMPUTERNAME-ne$ExpectedComputer){throw "Publishing is restricted to development computer $ExpectedComputer; current computer is $env:COMPUTERNAME."}
  $git=(Get-Command git.exe -ErrorAction Stop).Source
  $status=@(&$git -C $script:PublisherRoot status --porcelain=v1 --untracked-files=all)
  if($LASTEXITCODE-ne0){throw 'Git status failed.'}
  if($status.Count){throw "Publishing requires a clean committed tree. Commit or intentionally remove these changes first:`n$($status-join[Environment]::NewLine)"}
  $null=&$git -C $script:PublisherRoot diff --check
  if($LASTEXITCODE-ne0){throw 'Git diff --check failed.'}
  $commit=(&$git -C $script:PublisherRoot rev-parse HEAD).Trim();if($LASTEXITCODE-ne0-or$commit-notmatch'^[a-f0-9]{40}$'){throw 'Could not resolve the committed source identity.'}
  $branch=(&$git -C $script:PublisherRoot branch --show-current).Trim();if(-not$branch){throw 'Publishing from a detached Git HEAD is forbidden.'}
  $origin=(&$git -C $script:PublisherRoot remote get-url origin).Trim();if($origin-notmatch'(?i)(?:github\.com[:/])jyin29/grmetro-live-performance-center(?:\.git)?$'){throw 'Git origin is not jyin29/grmetro-live-performance-center.'}
  $null=Get-Command node.exe -ErrorAction Stop;$null=Get-Command npm.cmd -ErrorAction Stop
  return [pscustomobject]@{Commit=$commit;Branch=$branch;Origin=$origin}
}

function Test-GrMetroPublisherOnlyResumeDelta([string[]]$Paths) {
  $allowed=@(
    '^scripts/windows/publish-update\.ps1$',
    '^tests/windows-release-publisher(?:-validation\.ps1|\.test\.js)$',
    '^docs/(?:TASKS|WINDOWS_RELEASE_WORKFLOW)\.md$'
  )
  $rejected=@($Paths|Where-Object{$path=$_;-not@($allowed|Where-Object{$path-match$_}).Count})
  return [pscustomobject]@{Safe=$rejected.Count-eq0;Rejected=@($rejected)}
}

function Get-GrMetroResumableCandidateCommit([string]$ReleaseDirectory,[string]$PublisherCommit) {
  $metadataPath=Join-Path $ReleaseDirectory 'release.json'
  if(-not(Test-Path -LiteralPath $metadataPath -PathType Leaf)){throw 'Pending release metadata is missing.'}
  try{$metadata=Get-Content -LiteralPath $metadataPath -Raw|ConvertFrom-Json}catch{throw 'Pending release metadata is malformed.'}
  $candidateCommit=[string]$metadata.sourceCommit
  if($candidateCommit-notmatch'^[a-f0-9]{40}$'){throw 'Pending release source commit is invalid.'}
  $git=(Get-Command git.exe -ErrorAction Stop).Source
  $null=&$git -C $script:PublisherRoot cat-file -e "$candidateCommit^{commit}" 2>$null;if($LASTEXITCODE-ne0){throw 'Pending release source commit is unavailable.'}
  $null=&$git -C $script:PublisherRoot merge-base --is-ancestor $candidateCommit $PublisherCommit
  if($LASTEXITCODE-ne0){throw 'Pending release source is not an ancestor of the publisher commit.'}
  if($candidateCommit-ne$PublisherCommit){
    $paths=@(&$git -C $script:PublisherRoot diff --name-only "$candidateCommit..$PublisherCommit");if($LASTEXITCODE-ne0){throw 'Could not audit changes made after the pending release was built.'}
    $audit=Test-GrMetroPublisherOnlyResumeDelta $paths
    if(-not$audit.Safe){throw "Pending release cannot resume because application-affecting files changed after it was built: $($audit.Rejected-join', ')"}
  }
  return $candidateCommit
}

function Test-GrMetroCloudflareAccess {
  param([string]$AccountId,[string]$BucketName)
  $who=Invoke-GrMetroWrangler @('whoami') -RetryTransient -Stage 'verify Cloudflare account authentication'
  if($who.Output-notmatch[regex]::Escape($AccountId)){throw 'Wrangler is authenticated to the wrong Cloudflare account.'}
  $buckets=Invoke-GrMetroWrangler @('r2','bucket','list') -RetryTransient -Stage 'verify Cloudflare R2 bucket access'
  if($buckets.Output-notmatch("(?m)^name:\s+"+[regex]::Escape($BucketName)+"\s*$")){throw "Cloudflare R2 bucket $BucketName is unavailable."}
  return [pscustomobject]@{AccountId=$AccountId;Bucket=$BucketName}
}

function Test-GrMetroR2Object {
  param([string]$BucketName,[string]$Key)
  $temporary=Join-Path $env:TEMP ('grmetro-r2-object-'+[guid]::NewGuid().ToString('N'))
  try{
    $result=Invoke-GrMetroWrangler @('r2','object','get',"$BucketName/$Key",'--remote','--file',$temporary) -AllowMissingObject -RetryTransient -Stage "read R2 object $Key"
    if($result.Missing){return [pscustomobject]@{Exists=$false;Key=$Key}}
    return [pscustomobject]@{Exists=$true;Key=$Key;Path=$temporary;Length=(Get-Item $temporary).Length;Sha256=(Get-FileHash $temporary -Algorithm SHA256).Hash}
  }finally{if(Test-Path -LiteralPath $temporary){Remove-Item -LiteralPath $temporary -Force}}
}

function Test-GrMetroReleaseCandidate {
  param([string]$ReleaseDirectory,[string]$ExpectedVersion,[string]$ExpectedCommit,[string]$PublicKeysPath,$SigningState)
  $zip=Join-Path $ReleaseDirectory "grmetro-performance-center-$ExpectedVersion.zip";$metadataPath=Join-Path $ReleaseDirectory 'release.json';$signaturePath=Join-Path $ReleaseDirectory 'release.json.sig'
  foreach($path in @($zip,$metadataPath,$signaturePath)){if(-not(Test-Path -LiteralPath $path -PathType Leaf)){throw "Release output is incomplete: $path"}}
  if(Test-Path -LiteralPath (Join-Path $ReleaseDirectory 'NOT-PRODUCTION-READY-UNSIGNED.txt')){throw 'Unsigned release output cannot be published.'}
  $package=Get-GrMetroPackageReleaseMetadata $zip
  if([string]$package.releaseVersion-ne$ExpectedVersion-or[string]$package.channel-ne'testing'-or[string]$package.commit-ne$ExpectedCommit-or[string]$package.sourceState-ne'committed'-or[int]$package.updaterProtocol-ne1){throw 'Packaged release identity does not match the committed testing release.'}
  $inspection=Test-GrMetroPackageArchive -PackageZip $zip -InstallRoot (Join-Path $env:TEMP 'GRMetro-Publisher-Archive-Target')
  foreach($required in @('runtime/node/node.exe','apps/dashboard/dist/index.html','scripts/windows/update-host-installation.ps1','GRMetro Performance Center.exe')){if($required-notin@($inspection.Files)){throw "Release package is missing $required"}}
  foreach($forbidden in @('.env','data/company-config.json','data/goals.json','data/display-settings.json','data/management-dismissals.json','logs/supervisor.log')){if($forbidden-in@($inspection.Files)){throw "Release package contains private runtime state: $forbidden"}}
  $keys=Get-GrMetroPinnedReleaseKeys $PublicKeysPath
  $metadata=ConvertFrom-GrMetroSignedReleaseMetadata ([IO.File]::ReadAllBytes($metadataPath)) ([IO.File]::ReadAllBytes($signaturePath)) $keys
  $zipHash=(Get-FileHash $zip -Algorithm SHA256).Hash;$zipSize=(Get-Item $zip).Length
  if([string]$metadata.releaseVersion-ne$ExpectedVersion-or[Int64]$metadata.releaseSequence-ne(ConvertTo-GrMetroReleaseVersion $ExpectedVersion).ReleaseSequence-or[string]$metadata.channel-ne'testing'-or[string]$metadata.sourceCommit-ne$ExpectedCommit-or[string]$metadata.artifactSha256-ne$zipHash-or[Int64]$metadata.artifactSize-ne$zipSize-or-not[bool]$metadata.authenticodeRequired){throw 'Signed release metadata does not match the application artifact.'}
  Add-Type -AssemblyName System.IO.Compression.FileSystem
  $temporary=Join-Path $env:TEMP ('grmetro-publisher-signature-'+[guid]::NewGuid().ToString('N'));New-Item -ItemType Directory -Path $temporary|Out-Null
  try{
    $launcher=Join-Path $temporary 'GRMetro Performance Center.exe';$archive=[IO.Compression.ZipFile]::OpenRead($zip)
    try{$entry=$archive.Entries|Where-Object{$_.FullName.Replace('\','/')-eq'GRMetro Performance Center.exe'}|Select-Object -First 1;if(-not$entry){throw 'Signed launcher is missing.'};[IO.Compression.ZipFileExtensions]::ExtractToFile($entry,$launcher,$false)}finally{$archive.Dispose()}
    $signature=Assert-GrMetroAuthenticodeSignature -Path $launcher -CertificateThumbprint $SigningState.Policy.SigningCertificateThumbprint -PinnedRootCertificatePath $SigningState.RootCertificatePath -PinnedRootThumbprint $SigningState.Policy.RootCertificateThumbprint -PinnedRootSubject $SigningState.Policy.RootCertificateSubject -PinnedRootSha256 $SigningState.Policy.RootCertificateSha256
    if(-not$signature.TimeStamperCertificate){throw 'Signed launcher timestamp is missing.'}
  }finally{Remove-Item -LiteralPath $temporary -Recurse -Force -ErrorAction SilentlyContinue}
  foreach($file in @(Get-ChildItem -LiteralPath $ReleaseDirectory -File|Where-Object{$_.Extension-in@('.json','.txt')})){
    $content=Get-Content -LiteralPath $file.FullName -Raw
    if($content.Contains([IO.Path]::GetFullPath($SigningKeyPath))-or$content-match'(?s)<D>.+</D>'){throw 'Release output exposes private signing material or its path.'}
  }
  return [pscustomobject]@{Directory=$ReleaseDirectory;Zip=$zip;Metadata=$metadataPath;Signature=$signaturePath;Version=$ExpectedVersion;Sequence=[Int64]$metadata.releaseSequence;ArtifactUrl=[string]$metadata.artifactUrl;ZipSha256=$zipHash;ZipSize=$zipSize;EntryCount=$inspection.EntryCount;ManifestFileCount=@($inspection.Files).Count;SignerThumbprint=$signature.SignerCertificate.Thumbprint}
}

function Test-GrMetroDefenderRelease {
  param($Candidate)
  $status=Get-MpComputerStatus -ErrorAction Stop
  if(-not$status.AntivirusEnabled-or-not$status.RealTimeProtectionEnabled){throw 'Microsoft Defender antivirus and real-time protection must be enabled before publishing.'}
  $before=@(Get-MpThreatDetection -ErrorAction SilentlyContinue|ForEach-Object{"$($_.ThreatID)|$($_.InitialDetectionTime.ToUniversalTime().ToString('o'))"})
  $inspection=Join-Path $env:TEMP ('grmetro-defender-release-'+[guid]::NewGuid().ToString('N'));New-Item -ItemType Directory -Path $inspection|Out-Null
  try{
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    [IO.Compression.ZipFile]::ExtractToDirectory($Candidate.Zip,$inspection)
    Start-MpScan -ScanType CustomScan -ScanPath $Candidate.Zip
    Start-MpScan -ScanType CustomScan -ScanPath $inspection
    $new=@(Get-MpThreatDetection -ErrorAction SilentlyContinue|Where-Object{"$($_.ThreatID)|$($_.InitialDetectionTime.ToUniversalTime().ToString('o'))"-notin$before})
    if($new.Count){throw 'Microsoft Defender reported a new detection while scanning the release ZIP or disposable extraction.'}
  }finally{Remove-Item -LiteralPath $inspection -Recurse -Force -ErrorAction SilentlyContinue}
  return [pscustomobject]@{AntivirusEnabled=$true;RealTimeProtectionEnabled=$true;NewDetections=0}
}

function Invoke-GrMetroImmutablePublicationPut {
  param(
    [Parameter(Mandatory=$true)]$Item,[Parameter(Mandatory=$true)][string]$Local,
    [Parameter(Mandatory=$true)][string]$ExpectedHash,[Parameter(Mandatory=$true)][Int64]$ExpectedLength,
    [Parameter(Mandatory=$true)][scriptblock]$ProbeAction,[Parameter(Mandatory=$true)][scriptblock]$PutAction,
    [int]$MaximumAttempts=4,[int]$InitialDelayMilliseconds=1000,
    [scriptblock]$SleepAction={param($milliseconds)Start-Sleep -Milliseconds $milliseconds}
  )
  if($ExpectedHash-notmatch'^[A-Fa-f0-9]{64}$'-or$ExpectedLength-lt1){throw 'Immutable publication identity is invalid.'}
  for($attempt=1;$attempt-le$MaximumAttempts;$attempt++){
    try{&$PutAction $Item $Local;return [pscustomobject]@{RecoveredAfterTransient=$false;Attempts=$attempt}}
    catch{
      $failure=$_
      if(-not(Test-GrMetroTransientNetworkError $failure)){throw "Publisher stage 'upload immutable R2 object $($Item.Key)' failed without retry: $($failure.Exception.Message)"}
      $observed=&$ProbeAction $Item
      if($observed.Exists){
        if([string]$observed.Sha256-eq$ExpectedHash-and[Int64]$observed.Length-eq$ExpectedLength){return [pscustomobject]@{RecoveredAfterTransient=$true;Attempts=$attempt}}
        throw "Publisher stage 'upload immutable R2 object $($Item.Key)' found conflicting remote bytes after a transient failure. The object was not overwritten."
      }
      if($attempt-eq$MaximumAttempts){throw "Publisher stage 'upload immutable R2 object $($Item.Key)' failed after $attempt transient attempts and the object remains absent: $($failure.Exception.Message)"}
      $delay=[int]($InitialDelayMilliseconds*[Math]::Pow(2,$attempt-1));Write-Warning "Immutable upload $($Item.Key) was not committed after transient attempt $attempt/$MaximumAttempts. Retrying in $delay ms.";&$SleepAction $delay
    }
  }
}

function Invoke-GrMetroPublicationTransaction {
  param(
    [Parameter(Mandatory=$true)]$Candidate,
    [Parameter(Mandatory=$true)][scriptblock]$ProbeAction,
    [Parameter(Mandatory=$true)][scriptblock]$PutAction,
    [Parameter(Mandatory=$true)][scriptblock]$VerifyAction,
    [Parameter(Mandatory=$true)][scriptblock]$BackupAction,
    [Parameter(Mandatory=$true)][scriptblock]$RestoreAction,
    [scriptblock]$SleepAction={param($milliseconds)Start-Sleep -Milliseconds $milliseconds}
  )
  $plan=Get-GrMetroPublicationPlan $Candidate.Version
  $previous=Invoke-GrMetroTransientNetworkOperation -Stage 'capture prior signed staging metadata for rollback' -Action $BackupAction -SleepAction $SleepAction
  $zipState=Invoke-GrMetroTransientNetworkOperation -Stage "probe immutable R2 object $($plan[0].Key)" -Action {&$ProbeAction $plan[0]} -SleepAction $SleepAction
  if($zipState.Exists-and([string]$zipState.Sha256-ne[string]$Candidate.ZipSha256-or[Int64]$zipState.Length-ne[Int64]$Candidate.ZipSize)){throw 'The immutable versioned ZIP key already exists with different bytes.'}
  $zipReused=[bool]$zipState.Exists
  $zipRecovered=$false
  if(-not$zipReused){$zipPut=Invoke-GrMetroImmutablePublicationPut -Item $plan[0] -Local $Candidate.Zip -ExpectedHash $Candidate.ZipSha256 -ExpectedLength $Candidate.ZipSize -ProbeAction $ProbeAction -PutAction $PutAction -SleepAction $SleepAction;$zipRecovered=[bool]$zipPut.RecoveredAfterTransient}
  $null=Invoke-GrMetroTransientNetworkOperation -Stage "verify immutable ZIP through R2 and public HTTPS $($plan[0].Url)" -Action {&$VerifyAction $plan[0] $Candidate.Zip} -SleepAction $SleepAction
  $mutableStarted=$false
  try{
    $mutableStarted=$true
    $null=Invoke-GrMetroTransientNetworkOperation -Stage "upload detached signature to R2 $($plan[1].Key)" -Action {&$PutAction $plan[1] $Candidate.Signature} -SleepAction $SleepAction
    $null=Invoke-GrMetroTransientNetworkOperation -Stage "verify detached signature through R2 and public HTTPS $($plan[1].Url)" -Action {&$VerifyAction $plan[1] $Candidate.Signature} -SleepAction $SleepAction
    $null=Invoke-GrMetroTransientNetworkOperation -Stage "upload signed release metadata last to R2 $($plan[2].Key)" -Action {&$PutAction $plan[2] $Candidate.Metadata} -SleepAction $SleepAction
    $null=Invoke-GrMetroTransientNetworkOperation -Stage "verify signed release metadata through R2 and public HTTPS $($plan[2].Url)" -Action {&$VerifyAction $plan[2] $Candidate.Metadata} -SleepAction $SleepAction
  }catch{
    $failure=$_
    if($mutableStarted){try{$null=Invoke-GrMetroTransientNetworkOperation -Stage 'restore prior signed staging metadata after publication failure' -Action {&$RestoreAction $previous} -SleepAction $SleepAction}catch{throw "Publication failed: $($failure.Exception.Message). Staging metadata rollback also failed: $($_.Exception.Message)"}}
    throw $failure
  }
  return [pscustomobject]@{Status='published';Version=$Candidate.Version;Sequence=$Candidate.Sequence;ZipReused=$zipReused;ZipRecoveredAfterTransient=$zipRecovered;Plan=$plan;Previous=$previous}
}

function Invoke-GrMetroPublishUpdate {
  $repository=Test-GrMetroReleaseRepository $ExpectedDevelopmentComputer
  $signing=Test-GrMetroReleaseSigningMaterials $SigningKeyPath $ReleasePublicKeysPath $AuthenticodeRootCertificatePath $KeyId
  $cloudflare=Test-GrMetroCloudflareAccess $CloudflareAccountId $Bucket
  $remote=Get-GrMetroRemoteStagingRelease $ReleasePublicKeysPath $Origin
  if($remote.Metadata.PSObject.Properties['sourceCommit']-and[string]$remote.Metadata.sourceCommit-eq$repository.Commit){throw 'The current committed source is already published. Commit a new reviewed change before publishing another version.'}
  $version=Get-GrMetroNextStagingVersion ([string]$remote.Metadata.releaseVersion)
  if(-not$OutputRoot){$script:OutputRoot=Join-Path $script:PublisherRoot 'dist\windows-releases'}else{$script:OutputRoot=[IO.Path]::GetFullPath($OutputRoot)}
  $pending=@(Get-ChildItem -LiteralPath $script:OutputRoot -Directory -ErrorAction SilentlyContinue|Where-Object{$_.Name-match'^GRMetro-(\d{4}\.\d{1,2}\.\d{1,2}\.\d{1,4})$' -and (Compare-GrMetroReleaseVersion $matches[1] ([string]$remote.Metadata.releaseVersion))-gt0})
  if($pending.Count-gt1){throw 'Multiple unpublished local releases exist. Resolve them before one-click publication.'}
  $notesTemporary=$null
  $candidateCommit=$repository.Commit
  try{
    if($pending.Count-eq1){
      $releaseDirectory=$pending[0].FullName;$version=$pending[0].Name.Substring(8)
      $candidateCommit=Get-GrMetroResumableCandidateCommit $releaseDirectory $repository.Commit
      if($PlanOnly){return [pscustomobject]@{Status='planned-resume';Version=$version;Commit=$candidateCommit;PublisherCommit=$repository.Commit;Channel='testing';ReleaseDirectory=$releaseDirectory;Cloudflare=$cloudflare;SigningKeyFingerprint=$signing.KeyFingerprint}}
      if(-not$ConfirmPublish){$answer=Read-Host "Resume validated publication of $version from candidate commit $($candidateCommit.Substring(0,12)) using publisher $($repository.Commit.Substring(0,12))? Type PUBLISH";if($answer-ne'PUBLISH'){throw 'Publication was cancelled.'}}
    }else{
      $notes=$ReleaseNotesPath
      if(-not$notes){$notesTemporary=Join-Path $env:TEMP ('grmetro-release-notes-'+[guid]::NewGuid().ToString('N')+'.txt');$subject=(& git.exe -C $script:PublisherRoot log -1 --format=%s).Trim();if(-not$subject){throw 'The latest commit has no release-note subject.'};[IO.File]::WriteAllText($notesTemporary,$subject+[Environment]::NewLine,(New-Object Text.UTF8Encoding $false));$notes=$notesTemporary}
      $artifactUrl="$Origin/staging/grmetro-performance-center-$version.zip"
      if(-not$ConfirmPublish){$answer=Read-Host "Publish committed source $($repository.Commit.Substring(0,12)) as $version to Cloudflare testing after tests/build/signing? Type PUBLISH";if($answer-ne'PUBLISH'){throw 'Publication was cancelled before build.'}}
      if($PlanOnly){return [pscustomobject]@{Status='planned';Version=$version;Commit=$repository.Commit;Channel='testing';ArtifactUrl=$artifactUrl;Cloudflare=$cloudflare;SigningKeyFingerprint=$signing.KeyFingerprint}}
      & npm.cmd test
      if($LASTEXITCODE-ne0){throw 'Release tests failed.'}
      $previousNodeOptions=$env:NODE_OPTIONS;$env:NODE_OPTIONS='--max-old-space-size=4096'
      try{
        & (Join-Path $PSScriptRoot 'create-windows-release.ps1') -Version $version -Channel testing -ArtifactUrl $artifactUrl -SigningKeyPath $SigningKeyPath -KeyId $KeyId -ReleaseNotesPath $notes -OutputRoot $script:OutputRoot -RequireAuthenticode -AuthenticodePolicyPath $script:PublisherPolicy -AuthenticodeRootCertificatePath $AuthenticodeRootCertificatePath -PackageOnly
      }finally{$env:NODE_OPTIONS=$previousNodeOptions}
      $releaseDirectory=Join-Path $script:OutputRoot "GRMetro-$version"
    }
    $candidate=Test-GrMetroReleaseCandidate $releaseDirectory $version $candidateCommit $ReleasePublicKeysPath $signing
    $null=Test-GrMetroDefenderRelease $candidate
    $currentRemote=Get-GrMetroRemoteStagingRelease $ReleasePublicKeysPath $Origin
    if([Int64]$currentRemote.Metadata.releaseSequence-ne[Int64]$remote.Metadata.releaseSequence-or[string]$currentRemote.Metadata.artifactSha256-ne[string]$remote.Metadata.artifactSha256){throw 'Staging metadata changed after preflight; refusing to publish.'}
    $backupRoot=Join-Path $env:USERPROFILE 'GRMetro-Cloudflare-Publication-Backups'
    $backupPath=Join-Path $backupRoot ("staging-$($remote.Metadata.releaseVersion)-before-$version-"+[DateTime]::UtcNow.ToString('yyyyMMddTHHmmssZ'))
    $publication=Invoke-GrMetroPublicationTransaction -Candidate $candidate `
      -ProbeAction {param($item)Test-GrMetroR2Object $Bucket $item.Key} `
      -PutAction {param($item,$local)$null=Invoke-GrMetroWrangler @('r2','object','put',"$Bucket/$($item.Key)",'--remote','--file',$local,'--content-type',$item.ContentType,'--cache-control',$item.CacheControl)} `
      -VerifyAction {param($item,$local)
        $r2=Test-GrMetroR2Object $Bucket $item.Key;if(-not$r2.Exists){throw "Published R2 object is missing: $($item.Key)"}
        $localHash=(Get-FileHash $local -Algorithm SHA256).Hash;$localSize=(Get-Item $local).Length;if($r2.Sha256-ne$localHash-or$r2.Length-ne$localSize){throw "R2 object differs from local bytes: $($item.Key)"}
        $public=Join-Path $env:TEMP ('grmetro-public-verify-'+[guid]::NewGuid().ToString('N'));try{
          $head=Invoke-GrMetroTransientNetworkOperation -Stage "read public HEAD $($item.Url)" -Action {Invoke-WebRequest -UseBasicParsing -Uri $item.Url -Method Head -MaximumRedirection 0 -TimeoutSec 30}
          Invoke-GrMetroHttpDownload -Stage "download public object $($item.Url)" -Uri $item.Url -OutFile $public -TimeoutSeconds 180
          if((Get-FileHash $public -Algorithm SHA256).Hash-ne$localHash-or(Get-Item $public).Length-ne$localSize){throw "Public object differs from local bytes: $($item.Key)"}
          $expectedType=($item.ContentType-split';')[0];if([int]$head.StatusCode-ne200-or-not([string]$head.Headers['Content-Type']).StartsWith($expectedType,[StringComparison]::OrdinalIgnoreCase)){throw "Public object has an unexpected Content-Type: $($item.Key)"}
          if([string]$head.Headers['Cache-Control']-ne$item.CacheControl){throw "Public object has an unexpected cache policy: $($item.Key)"}
        }finally{if(Test-Path $public){Remove-Item $public -Force}}
      } `
      -BackupAction {
        New-Item -ItemType Directory -Force -Path $backupRoot,$backupPath|Out-Null
        $oldMetadata=Join-Path $backupPath 'release.json';$oldSignature=Join-Path $backupPath 'release.json.sig';Remove-Item -LiteralPath $oldMetadata,$oldSignature -Force -ErrorAction SilentlyContinue;$null=Invoke-GrMetroWrangler @('r2','object','get',"$Bucket/staging/release.json",'--remote','--file',$oldMetadata);$null=Invoke-GrMetroWrangler @('r2','object','get',"$Bucket/staging/release.json.sig",'--remote','--file',$oldSignature)
        $state=[pscustomobject]@{Path=$backupPath;Metadata=$oldMetadata;Signature=$oldSignature;Version=[string]$remote.Metadata.releaseVersion;MetadataSha256=(Get-FileHash $oldMetadata -Algorithm SHA256).Hash;SignatureSha256=(Get-FileHash $oldSignature -Algorithm SHA256).Hash}
        if($state.MetadataSha256-ne$remote.MetadataSha256-or$state.SignatureSha256-ne$remote.SignatureSha256){throw 'Direct R2 metadata differs from the signed public feed during rollback capture.'}
        [ordered]@{schemaVersion=1;capturedAt=[DateTime]::UtcNow.ToString('o');bucket=$Bucket;channel='testing';priorVersion=$state.Version;targetVersion=$version;metadataSha256=$state.MetadataSha256;signatureSha256=$state.SignatureSha256}|ConvertTo-Json|Set-Content (Join-Path $backupPath 'rollback-metadata.json') -Encoding UTF8
        $state
      } `
      -RestoreAction {param($previous)
        $null=Invoke-GrMetroWrangler @('r2','object','put',"$Bucket/staging/release.json.sig",'--remote','--file',$previous.Signature,'--content-type','application/octet-stream','--cache-control','no-store')
        $null=Invoke-GrMetroWrangler @('r2','object','put',"$Bucket/staging/release.json",'--remote','--file',$previous.Metadata,'--content-type','application/json; charset=utf-8','--cache-control','no-store')
        $restoredMetadata=Test-GrMetroR2Object $Bucket 'staging/release.json';$restoredSignature=Test-GrMetroR2Object $Bucket 'staging/release.json.sig'
        if(-not$restoredMetadata.Exists-or-not$restoredSignature.Exists-or$restoredMetadata.Sha256-ne$previous.MetadataSha256-or$restoredSignature.Sha256-ne$previous.SignatureSha256){throw 'Previous staging metadata could not be verified after rollback.'}
      }
    $verified=Get-GrMetroRemoteStagingRelease $ReleasePublicKeysPath $Origin
    if([string]$verified.Metadata.releaseVersion-ne$version-or[string]$verified.Metadata.artifactSha256-ne$candidate.ZipSha256){throw 'Final staging feed verification did not return the published release.'}
    $result=[pscustomobject]@{Status='SUCCESS';Version=$version;Sequence=$candidate.Sequence;Commit=$candidateCommit;PublisherCommit=$repository.Commit;Channel='testing';ArtifactUrl=$candidate.ArtifactUrl;ArtifactSha256=$candidate.ZipSha256;ArtifactSize=$candidate.ZipSize;ReleaseDirectory=$candidate.Directory;RollbackMetadata=$publication.Previous.Path;ZipReused=$publication.ZipReused;ZipRecoveredAfterTransient=$publication.ZipRecoveredAfterTransient}
    $result|ConvertTo-Json -Depth 5|Set-Content (Join-Path $publication.Previous.Path 'publication-result.json') -Encoding UTF8
    return $result
  }finally{if($notesTemporary-and(Test-Path $notesTemporary)){Remove-Item $notesTemporary -Force}}
}

if($MyInvocation.InvocationName-ne'.'){
  try{$publishResult=Invoke-GrMetroPublishUpdate;$publishResult|ConvertTo-Json -Depth 5}catch{Write-Host '';Write-Host "PUBLISH FAILED: $($_.Exception.Message)" -ForegroundColor Red;exit 1}
}
