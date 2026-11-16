[CmdletBinding()]
param(
  [string]$Commit,
  [string]$ExpectedBranch='feat/release-publisher',
  [string]$RepositoryRoot,
  [switch]$ConfirmImport
)

$ErrorActionPreference='Stop'
if(-not$RepositoryRoot){$RepositoryRoot=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..')).TrimEnd('\')}else{$RepositoryRoot=[IO.Path]::GetFullPath($RepositoryRoot).TrimEnd('\')}

function Assert-GrMetroReviewedCommitHash([string]$Value){
  $normalized=([string]$Value).Trim().ToLowerInvariant()
  if($normalized-notmatch'^[a-f0-9]{40}$'){throw 'Enter exactly one full 40-character Git commit SHA. Ranges, branches, tags, and abbreviated hashes are not accepted.'}
  return $normalized
}

function Assert-GrMetroReviewedPaths([string[]]$Paths){
  $items=@($Paths|Where-Object{$_})
  if(-not$items.Count){throw 'The reviewed commit does not change any files.'}
  $forbidden=@(
    '(^|/)\.env(?:\.|$)',
    '^data/company-config\.json$',
    '^\.git(?:modules|attributes|ignore)?$',
    '^\.github/',
    '(^|/)(?:logs?|cookies?|sessions?|storage-state|auth-state)(?:/|$)',
    '(?i)(?:private|secret).*(?:\.xml|\.pem|\.key|\.pfx|\.p12)$',
    '(^|/)(?:node_modules|dist)(?:/|$)',
    '^Publish GRMetro Update\.cmd$',
    '^Import Reviewed GRMetro Commit\.cmd$',
    '^scripts/windows/(?:publish-update|import-reviewed-commit|authenticode-signing|internal-authenticode-policy|install-internal-authenticode-trust|provision-internal-authenticode)\.(?:ps1|json)$',
    '^docs/(?:WINDOWS_RELEASE_WORKFLOW|WINDOWS_INTERNAL_CODE_SIGNING)\.md$'
  )
  $rejected=@()
  foreach($path in $items){
    if([IO.Path]::IsPathRooted($path)-or$path.Contains('..')){$rejected+=$path;continue}
    foreach($pattern in $forbidden){if($path-match$pattern){$rejected+=$path;break}}
  }
  if($rejected.Count){throw "The commit touches private, generated, or release-infrastructure paths and cannot be imported as an application change: $(@($rejected|Sort-Object -Unique)-join', ')"}
  return $items
}

function Invoke-GrMetroReviewedCommitImport {
  param(
    [Parameter(Mandatory=$true)][string]$Root,
    [Parameter(Mandatory=$true)][string]$CommitSha,
    [string]$RequiredBranch='feat/release-publisher',
    [switch]$Approved
  )
  $root=[IO.Path]::GetFullPath($Root).TrimEnd('\')
  if(-not(Test-Path -LiteralPath (Join-Path $root '.git'))){
    $gitMarker=Join-Path $root '.git';if(-not(Test-Path -LiteralPath $gitMarker -PathType Leaf)){throw 'The target is not a Git worktree.'}
  }
  $git=(Get-Command git.exe -ErrorAction Stop).Source
  $status=@(&$git -C $root status --porcelain=v1 --untracked-files=all)
  if($LASTEXITCODE-ne0-or$status.Count){throw 'The release worktree must be completely clean before importing a reviewed commit.'}
  $branch=(&$git -C $root branch --show-current).Trim()
  if($branch-ne$RequiredBranch){throw "Reviewed commits may be imported only into $RequiredBranch; current branch is $branch."}
  $sha=Assert-GrMetroReviewedCommitHash $CommitSha
  $null=&$git -C $root cat-file -e "$sha^{commit}" 2>$null
  if($LASTEXITCODE-ne0){throw "Commit $sha is not available in this repository. Fetch its branch first, then retry."}
  $resolved=(&$git -C $root rev-parse "$sha^{commit}").Trim()
  $parents=((&$git -C $root rev-list --parents -n 1 $resolved).Trim()-split' ')
  if($parents.Count-gt2){throw 'Merge commits are not accepted. Import the reviewed application commits individually in dependency order.'}
  $null=&$git -C $root merge-base --is-ancestor $resolved HEAD
  if($LASTEXITCODE-eq0){throw "Commit $resolved is already present in the release worktree."}
  if($LASTEXITCODE-ne1){throw 'Could not compare the reviewed commit with the release branch.'}
  $paths=@(&$git -C $root diff-tree --no-commit-id --name-only -r --root $resolved)
  $raw=@(&$git -C $root diff-tree --no-commit-id --raw -r --root $resolved)
  if(@($raw|Where-Object{$_-match'^:(?:120000|160000)\s'-or$_-match'^:\d{6}\s(?:120000|160000)\s'}).Count){throw 'Symlink and submodule changes are not accepted in reviewed application commits.'}
  $null=Assert-GrMetroReviewedPaths $paths
  $subject=(&$git -C $root show -s --format=%s $resolved).Trim()
  if(-not$Approved){
    Write-Host ''
    Write-Host "Reviewed commit: $resolved" -ForegroundColor Cyan
    Write-Host "Subject: $subject"
    Write-Host 'Files:'
    $paths|ForEach-Object{Write-Host "  $_"}
    $answer=Read-Host 'Type IMPORT to cherry-pick this one commit into the clean release worktree'
    if($answer-ne'IMPORT'){throw 'Commit import was cancelled before changing the release branch.'}
  }
  $start=(&$git -C $root rev-parse HEAD).Trim()
  $prior=$ErrorActionPreference;$ErrorActionPreference='Continue'
  try{$output=@(&$git -C $root cherry-pick $resolved 2>&1);$code=$LASTEXITCODE}finally{$ErrorActionPreference=$prior}
  if($code-ne0){
    $abort=@(&$git -C $root cherry-pick --abort 2>&1);$abortCode=$LASTEXITCODE
    $residual=@(&$git -C $root status --porcelain=v1 --untracked-files=all)
    if($abortCode-ne0-or$residual.Count-or(&$git -C $root rev-parse HEAD).Trim()-ne$start){throw "Commit import conflicted and automatic abort could not restore the clean starting point. Stop and inspect $root. Git output: $($output-join' ') $($abort-join' ')"}
    throw "Commit import conflicted and was safely aborted. The release worktree is unchanged. Git output: $($output-join' ')"
  }
  $null=&$git -C $root diff --check HEAD^ HEAD
  if($LASTEXITCODE-ne0){throw 'Imported commit failed git diff --check.'}
  $after=@(&$git -C $root status --porcelain=v1 --untracked-files=all)
  if($after.Count){throw 'Imported commit left unexpected uncommitted files in the release worktree.'}
  return [pscustomobject]@{Status='IMPORTED';Branch=$branch;ImportedCommit=$resolved;ImportedSubject=$subject;NewHead=(&$git -C $root rev-parse HEAD).Trim();ChangedPaths=$paths}
}

if($MyInvocation.InvocationName-ne'.'){
  try{
    if(-not$Commit){$Commit=Read-Host 'Paste the full 40-character SHA of one reviewed application commit'}
    $result=Invoke-GrMetroReviewedCommitImport -Root $RepositoryRoot -CommitSha $Commit -RequiredBranch $ExpectedBranch -Approved:$ConfirmImport
    $result|ConvertTo-Json -Depth 5
  }catch{Write-Host '';Write-Host "IMPORT FAILED: $($_.Exception.Message)" -ForegroundColor Red;exit 1}
}
