$ErrorActionPreference='Stop'
$repository=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..')).TrimEnd('\')
. (Join-Path $repository 'scripts\windows\import-reviewed-commit.ps1')
function Assert($condition,[string]$message){if(-not$condition){throw $message}}
function Expect-Failure([scriptblock]$action,[string]$pattern,[string]$message){$failure=$null;try{&$action}catch{$failure=$_.Exception.Message};Assert ($failure-and$failure-match$pattern) "$message Observed: $failure"}

$valid='0123456789abcdef0123456789abcdef01234567'
Assert ((Assert-GrMetroReviewedCommitHash $valid)-eq$valid) 'Full commit SHA validation changed a valid hash.'
foreach($invalid in @('0123456','main','HEAD','abc..def','0123456789abcdef0123456789abcdef0123456g')){Expect-Failure {Assert-GrMetroReviewedCommitHash $invalid} 'exactly one full' "Invalid commit selector was accepted: $invalid"}
$null=Assert-GrMetroReviewedPaths @('apps/backend/src/app.js','apps/dashboard/src/App.jsx')
foreach($private in @('.env','data/company-config.json','logs/supervisor.log','dist/package.zip','keys/private.xml','scripts/windows/publish-update.ps1','.gitmodules')){Expect-Failure {Assert-GrMetroReviewedPaths @($private)} 'cannot be imported' "Forbidden path was accepted: $private"}

$fixture=Join-Path $env:TEMP ('grmetro-release-import-'+[guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $fixture|Out-Null
try{
  & git.exe -C $fixture init|Out-Null;& git.exe -C $fixture config user.name 'GRMetro Test';& git.exe -C $fixture config user.email 'test@invalid.local'
  [IO.File]::WriteAllText((Join-Path $fixture 'app.txt'),"base`n");& git.exe -C $fixture add -- app.txt;& git.exe -C $fixture commit -m 'base'|Out-Null;& git.exe -C $fixture branch -M release
  $base=(& git.exe -C $fixture rev-parse HEAD).Trim()
  & git.exe -C $fixture checkout -b reviewed|Out-Null;[IO.File]::WriteAllText((Join-Path $fixture 'app.txt'),"reviewed`n");& git.exe -C $fixture add -- app.txt;& git.exe -C $fixture commit -m 'feat: reviewed app change'|Out-Null;$reviewed=(& git.exe -C $fixture rev-parse HEAD).Trim()
  & git.exe -C $fixture checkout release|Out-Null
  $imported=Invoke-GrMetroReviewedCommitImport -Root $fixture -CommitSha $reviewed -RequiredBranch release -Approved
  Assert ($imported.Status-eq'IMPORTED'-and(Get-Content (Join-Path $fixture 'app.txt')-Raw).Trim()-eq'reviewed') 'Reviewed commit was not imported into the release branch.'
  Assert (-not@(git.exe -C $fixture status --porcelain=v1 --untracked-files=all).Count) 'Successful import left a dirty worktree.'
  & git.exe -C $fixture checkout -b conflict $base|Out-Null;[IO.File]::WriteAllText((Join-Path $fixture 'app.txt'),"conflict`n");& git.exe -C $fixture add -- app.txt;& git.exe -C $fixture commit -m 'feat: conflicting app change'|Out-Null;$conflict=(& git.exe -C $fixture rev-parse HEAD).Trim()
  & git.exe -C $fixture checkout release|Out-Null;$start=(& git.exe -C $fixture rev-parse HEAD).Trim()
  Expect-Failure {Invoke-GrMetroReviewedCommitImport -Root $fixture -CommitSha $conflict -RequiredBranch release -Approved} 'safely aborted' 'Conflicting import did not report a safe abort.'
  Assert ((& git.exe -C $fixture rev-parse HEAD).Trim()-eq$start) 'Conflicting import changed release HEAD after abort.'
  Assert (-not@(git.exe -C $fixture status --porcelain=v1 --untracked-files=all).Count) 'Conflicting import left residual files after abort.'
}finally{if(Test-Path $fixture){$resolved=[IO.Path]::GetFullPath($fixture);$tempRoot=[IO.Path]::GetFullPath($env:TEMP).TrimEnd('\\');if([IO.Path]::GetDirectoryName($resolved).TrimEnd('\\')-ne$tempRoot-or[IO.Path]::GetFileName($resolved)-notlike'grmetro-release-import-*'){throw 'Unsafe import fixture cleanup path.'};Remove-Item -LiteralPath $resolved -Recurse -Force}}

$source=Get-Content -LiteralPath (Join-Path $repository 'scripts\windows\import-reviewed-commit.ps1') -Raw
foreach($required in @('status --porcelain','branch --show-current','cat-file','diff-tree','cherry-pick $resolved','cherry-pick --abort','Assert-GrMetroReviewedPaths','120000','160000')){Assert ($source-match[regex]::Escape($required)) "Import helper is missing safety behavior: $required"}
Assert ($source-notmatch'(?i)git\s+(?:reset|clean)|git\.exe\s+(?:reset|clean)|add\s+-A') 'Import helper contains a destructive or broad Git command.'
Write-Output 'PASS: one-commit import accepts reviewed changes, rejects unsafe selectors and paths, and aborts conflicts cleanly.'
