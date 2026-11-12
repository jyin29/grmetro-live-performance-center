$ErrorActionPreference='Stop'
$repository=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..')).TrimEnd('\')
. (Join-Path $repository 'scripts\windows\publish-update.ps1')

function Assert($condition,[string]$message){if(-not$condition){throw $message}}
function Expect-Failure([scriptblock]$action,[string]$pattern,[string]$message){
  $failure=$null;try{&$action}catch{$failure=$_.Exception.Message}
  Assert ($failure-and$failure-match$pattern) "$message Observed: $failure"
}

Assert ((Get-GrMetroNextStagingVersion '2026.11.10.1' ([DateTime]'2026-11-12'))-eq'2026.11.12.1') 'A new release day did not start at revision 1.'
Assert ((Get-GrMetroNextStagingVersion '2026.11.12.3' ([DateTime]'2026-11-12'))-eq'2026.11.12.4') 'Same-day revision did not increment.'
Expect-Failure {Get-GrMetroNextStagingVersion '2026.11.13.1' ([DateTime]'2026-11-12')} 'ahead of the development computer' 'Future published dates were not rejected.'
Expect-Failure {Get-GrMetroNextStagingVersion '2026.11.12.9999' ([DateTime]'2026-11-12')} 'revision limit' 'Revision overflow was not rejected.'

$plan=Get-GrMetroPublicationPlan '2026.11.12.1'
Assert (($plan.Kind-join',')-eq'zip,signature,metadata') 'Publication order is not ZIP, signature, metadata.'
Assert ($plan[0].Key-eq'staging/grmetro-performance-center-2026.11.12.1.zip') 'Immutable ZIP key is incorrect.'
Assert ($plan[2].Key-eq'staging/release.json') 'Release metadata is not last.'

$candidate=[pscustomobject]@{Version='2026.11.12.1';Sequence=202611120001;Zip='package.zip';Signature='release.json.sig';Metadata='release.json';ZipSha256=('A'*64);ZipSize=100}
$events=New-Object Collections.Generic.List[string]
$success=Invoke-GrMetroPublicationTransaction -Candidate $candidate `
  -ProbeAction {param($item)$events.Add("probe:$($item.Kind)")|Out-Null;[pscustomobject]@{Exists=$false}} `
  -PutAction {param($item,$local)$events.Add("put:$($item.Kind)")|Out-Null} `
  -VerifyAction {param($item,$local)$events.Add("verify:$($item.Kind)")|Out-Null} `
  -BackupAction {$events.Add('backup')|Out-Null;[pscustomobject]@{Version='old'}} `
  -RestoreAction {param($previous)$events.Add('restore')|Out-Null}
Assert ($success.Status-eq'published'-and-not$success.ZipReused) 'Successful publication result is incorrect.'
Assert (($events-join',')-eq'backup,probe:zip,put:zip,verify:zip,put:signature,verify:signature,put:metadata,verify:metadata') 'Successful publication did not follow the safe object order.'

$events.Clear()
$reused=Invoke-GrMetroPublicationTransaction -Candidate $candidate `
  -ProbeAction {param($item)$events.Add("probe:$($item.Kind)")|Out-Null;[pscustomobject]@{Exists=$true;Sha256=('A'*64);Length=100}} `
  -PutAction {param($item,$local)$events.Add("put:$($item.Kind)")|Out-Null} `
  -VerifyAction {param($item,$local)$events.Add("verify:$($item.Kind)")|Out-Null} `
  -BackupAction {$events.Add('backup')|Out-Null;[pscustomobject]@{Version='old'}} `
  -RestoreAction {param($previous)$events.Add('restore')|Out-Null}
Assert $reused.ZipReused 'An identical immutable ZIP was not safely reused.'
Assert ('put:zip'-notin$events) 'An identical immutable ZIP was overwritten during retry.'

Expect-Failure {
  Invoke-GrMetroPublicationTransaction -Candidate $candidate `
    -ProbeAction {param($item)[pscustomobject]@{Exists=$true;Sha256=('B'*64);Length=100}} `
    -PutAction {param($item,$local)} -VerifyAction {param($item,$local)} `
    -BackupAction {[pscustomobject]@{Version='old'}} -RestoreAction {param($previous)}
} 'different bytes' 'A conflicting immutable ZIP was accepted.'

$events.Clear()
Expect-Failure {
  Invoke-GrMetroPublicationTransaction -Candidate $candidate `
    -ProbeAction {param($item)[pscustomobject]@{Exists=$false}} `
    -PutAction {param($item,$local)$events.Add("put:$($item.Kind)")|Out-Null;if($item.Kind-eq'metadata'){throw 'INJECTED METADATA FAILURE'}} `
    -VerifyAction {param($item,$local)$events.Add("verify:$($item.Kind)")|Out-Null} `
    -BackupAction {$events.Add('backup')|Out-Null;[pscustomobject]@{Version='old'}} `
    -RestoreAction {param($previous)$events.Add('restore')|Out-Null}
} 'INJECTED METADATA FAILURE' 'Metadata publication failure was not preserved.'
Assert (@($events|Where-Object{$_-eq'restore'}).Count-eq1) 'Metadata failure did not restore the prior signed feed exactly once.'

$publisher=Get-Content -LiteralPath (Join-Path $repository 'scripts\windows\publish-update.ps1') -Raw
$creator=Get-Content -LiteralPath (Join-Path $repository 'scripts\windows\create-windows-release.ps1') -Raw
$launcher=Get-Content -LiteralPath (Join-Path $repository 'Publish GRMetro Update.cmd') -Raw
$controlCenter=Get-Content -LiteralPath (Join-Path $repository 'scripts\windows\performance-center-launcher-v2.ps1') -Raw
foreach($required in @('status --porcelain','Get-GrMetroCodeSigningCertificate','Get-MpComputerStatus','wrangler@','r2','bucket','list','sourceCommit','RestoreAction')){Assert ($publisher-match[regex]::Escape($required)) "Publisher preflight is missing $required."}
Assert ($creator-match'if\(\$PackageOnly\).*buildArguments.*PackageOnly') 'Routine release creation does not request an application-only package.'
Assert ($creator-match'sourceCommit') 'Signed release metadata does not record the source commit.'
Assert ($launcher-match'publish-update\.ps1') 'Development launcher does not invoke the publisher.'
Assert ($publisher-notmatch'(?i)-Mode\s+(?:ApplyLocal|PrepareRemote)|InstallRemote') 'Development publisher can trigger production installation.'
foreach($label in @('InstalledReleaseText','AvailableReleaseText','UpdateProgress','UpdateStateText','Recovery Logs','Update Now')){Assert ($controlCenter-match[regex]::Escape($label)) "Control Center update UX is missing $label."}

Write-Output 'PASS: version selection, immutable publication order, safe resume, metadata rollback, signing preflight, and existing Control Center update UX.'
