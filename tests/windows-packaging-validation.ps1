$ErrorActionPreference = 'Stop'
$repository = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
. (Join-Path $repository 'scripts/windows/package-files.ps1')
function Assert($condition, [string]$message) { if (-not $condition) { throw $message } }
function Expect-Failure([scriptblock]$action, [string]$message) {
  $failed = $false
  try { & $action } catch { $failed = $true }
  Assert $failed $message
}
function Write-Fixture([string]$path, [string]$value) {
  New-Item -ItemType Directory -Force -Path ([IO.Path]::GetDirectoryName($path)) | Out-Null
  [IO.File]::WriteAllText($path, $value)
}

$fixture = Join-Path ([IO.Path]::GetTempPath()) ('grmetro validation ' + [guid]::NewGuid())
try {
  # No launcher/installer entry point is executed. Only pure packaging functions,
  # extracted UI markup, and harmless child scripts inside this fixture are exercised.
  $source = Join-Path $fixture 'source'
  $stage = Join-Path $fixture 'stage'
  $transactionSource = Join-Path $fixture 'transaction source'
  $transactionStage = Join-Path $fixture 'transaction stage'
  $installed = Join-Path $fixture 'installed/Performance Center'
  $zip = Join-Path $fixture 'package.zip'
  $manifestPath = 'scripts/windows/package-manifest.json'
  $manifestText = Get-Content -LiteralPath (Join-Path $repository $manifestPath) -Raw
  $manifest = $manifestText | ConvertFrom-Json
  $files = @(Get-GrMetroPackageFiles $manifest)
  $obsoletePath = 'scripts/windows/obsolete-tool.ps1'
  # Keep repeated transaction scenarios fast while retaining every required file.
  $transactionFiles = @('package.json','package-lock.json','.env.example','apps/backend/src/index.js','scripts/windows/package-manifest.json','scripts/windows/package-files.ps1','scripts/windows/env-wizard.ps1','GRMetro Performance Center.exe')
  $transactionManifest = [ordered]@{ version = 1; files = @($transactionFiles | Sort-Object -Unique) }
  $transactionManifestText = ($transactionManifest | ConvertTo-Json -Depth 3) + [Environment]::NewLine
  $oldManifest = [ordered]@{ version = 1; files = @($transactionFiles + $obsoletePath | Sort-Object -Unique) }
  $oldManifestText = ($oldManifest | ConvertTo-Json -Depth 3) + [Environment]::NewLine
  foreach ($relative in $files) { Write-Fixture (Join-Path $source $relative) ('application ' + $relative) }
  Write-Fixture (Join-Path $source $manifestPath) $manifestText
  $privatePaths = @('.env','.env.production','.grmetro-autostart-choice','data/company-config.json','data/goals.json','data/goals.json.tmp','data/display-settings.json','apps/backend/data/goals.json','apps/backend/data/display-settings.json','apps/backend/data/spreadsheet-slide.json','config/company.local.json','apps/backend/config/company.private.json','logs/supervisor.log','browser-profile/Cookies','~.DDF','node_modules/local.txt','apps/dashboard/dist/old.js','scripts/windows/local.ps1','apps/backend/src/local.private.json')
  foreach ($relative in $privatePaths) {
    Write-Fixture (Join-Path $source $relative) 'DO NOT PACKAGE'
    Write-Fixture (Join-Path $installed $relative) ('PRESERVE ' + $relative)
  }
  Write-Fixture (Join-Path $installed 'apps/backend/src/index.js') 'old application'
  Write-Fixture (Join-Path $installed $manifestPath) $oldManifestText
  Write-Fixture (Join-Path $installed $obsoletePath) 'obsolete application file'
  Copy-GrMetroPackageFiles $source $stage
  $staged = @(Get-ChildItem -LiteralPath $stage -Recurse -File -Force)
  Assert ($staged.Count -eq $files.Count) 'Stage must contain only manifest files.'
  foreach ($relative in $privatePaths) { Assert (-not (Test-Path -LiteralPath (Join-Path $stage $relative))) "Packaged local file: $relative" }
  foreach ($relative in $transactionFiles) { Write-Fixture (Join-Path $transactionSource $relative) ('application ' + $relative) }
  Write-Fixture (Join-Path $transactionSource $manifestPath) $transactionManifestText
  Copy-GrMetroPackageFiles $transactionSource $transactionStage
  Add-Type -AssemblyName System.IO.Compression.FileSystem
  [IO.Compression.ZipFile]::CreateFromDirectory($transactionStage, $zip)
  Install-GrMetroPackageFiles $zip $installed
  Assert ((Get-Content -LiteralPath (Join-Path $installed 'apps/backend/src/index.js') -Raw) -eq 'application apps/backend/src/index.js') 'Application was not upgraded.'
  Assert (-not (Test-Path -LiteralPath (Join-Path $installed $obsoletePath))) 'Manifest-listed obsolete application file survived upgrade.'
  foreach ($relative in $privatePaths) { Assert ((Get-Content -LiteralPath (Join-Path $installed $relative) -Raw) -eq ('PRESERVE ' + $relative)) "Reinstall modified local file: $relative" }

  # A failure after every replacement and obsolete deletion must restore the
  # complete prior application, including its old manifest and obsolete file.
  Write-Fixture (Join-Path $installed 'apps/backend/src/index.js') 'stable application before failed upgrade'
  Write-Fixture (Join-Path $installed $manifestPath) $oldManifestText
  Write-Fixture (Join-Path $installed $obsoletePath) 'restore obsolete file'
  $failedAtObsoleteRemoval = $false
  try {
    Install-GrMetroPackageFiles $zip $installed -FailureInjector {
      param($phase, $relative)
      if ($phase -eq 'remove-obsolete' -and $relative -eq $obsoletePath) { throw 'Injected upgrade failure.' }
    }
  } catch {
    $failedAtObsoleteRemoval = $_.Exception.Message -match 'Injected upgrade failure'
  }
  Assert $failedAtObsoleteRemoval 'Failed-upgrade injection did not run.'
  Assert ((Get-Content -LiteralPath (Join-Path $installed 'apps/backend/src/index.js') -Raw) -eq 'stable application before failed upgrade') 'Rollback did not restore replaced application file.'
  Assert ((Get-Content -LiteralPath (Join-Path $installed $obsoletePath) -Raw) -eq 'restore obsolete file') 'Rollback did not restore removed obsolete application file.'
  Assert ((Get-Content -LiteralPath (Join-Path $installed $manifestPath) -Raw) -eq $oldManifestText) 'Rollback did not restore the prior manifest.'
  Assert (-not (Test-Path -LiteralPath (Get-GrMetroUpgradeRoot $installed))) 'Completed rollback left a transaction directory.'
  foreach ($relative in $privatePaths) { Assert ((Get-Content -LiteralPath (Join-Path $installed $relative) -Raw) -eq ('PRESERVE ' + $relative)) "Failed upgrade modified local file: $relative" }

  # Simulate process termination after the journal commit and one replacement.
  # The next recovery call must restore the prior file before removing the journal.
  $upgradeRoot = Get-GrMetroUpgradeRoot $installed
  $backup = Get-GrMetroPackageDestination (Join-Path $upgradeRoot 'backup') 'apps/backend/src/index.js'
  Write-Fixture $backup 'application before interruption'
  Write-Fixture (Join-Path $installed 'apps/backend/src/index.js') 'partially replaced application'
  New-Item -ItemType Directory -Force -Path $upgradeRoot | Out-Null
  $journal = [ordered]@{ version=1; status='prepared'; installRoot=[IO.Path]::GetFullPath($installed).TrimEnd('\'); files=@([ordered]@{path='apps/backend/src/index.js';existed=$true}) }
  Write-GrMetroUpgradeJournal (Join-Path $upgradeRoot 'journal.json') $journal
  Assert (Restore-GrMetroUpgradeTransaction $installed) 'Interrupted transaction was not detected.'
  Assert ((Get-Content -LiteralPath (Join-Path $installed 'apps/backend/src/index.js') -Raw) -eq 'application before interruption') 'Interrupted upgrade recovery did not restore the application.'
  Assert (-not (Test-Path -LiteralPath $upgradeRoot)) 'Interrupted upgrade recovery left a transaction directory.'

  # A clean retry succeeds and removes obsolete files while preserving local data.
  Install-GrMetroPackageFiles $zip $installed
  Assert ((Get-Content -LiteralPath (Join-Path $installed 'apps/backend/src/index.js') -Raw) -eq 'application apps/backend/src/index.js') 'Retry after rollback did not upgrade the application.'
  Assert (-not (Test-Path -LiteralPath (Join-Path $installed $obsoletePath))) 'Retry did not remove obsolete application file.'
  foreach ($relative in $privatePaths) { Assert ((Get-Content -LiteralPath (Join-Path $installed $relative) -Raw) -eq ('PRESERVE ' + $relative)) "Retry modified local file: $relative" }

  # Reject unexpected/private/traversal entries before even overwriting application code.
  foreach ($badPath in @('.env','data/goals.json','apps/backend/data/spreadsheet-slide.json','../escape.txt','scripts/windows/unlisted.ps1')) {
    $badZip = Join-Path $fixture 'bad.zip'
    Copy-Item -LiteralPath $zip -Destination $badZip -Force
    $archive = [IO.Compression.ZipFile]::Open($badZip, 'Update')
    try { $null = $archive.CreateEntry($badPath) } finally { $archive.Dispose() }
    Write-Fixture (Join-Path $installed 'apps/backend/src/index.js') 'unchanged on rejection'
    Expect-Failure { Install-GrMetroPackageFiles $badZip $installed } "Accepted bad entry: $badPath"
    Assert ((Get-Content -LiteralPath (Join-Path $installed 'apps/backend/src/index.js') -Raw) -eq 'unchanged on rejection') 'Rejected archive changed the installation.'
  }
  foreach ($badPath in @('.env','data/company-config.json','apps/backend/data/goals.json','apps/backend/src/local.private.json','apps/backend/src/../data/goals.json','scripts/windows/../secrets.ps1','C:/outside.txt')) {
    Expect-Failure { Get-GrMetroPackageFiles ([pscustomobject]@{version=1;files=@($files)+$badPath}) } "Manifest admitted private/unsafe path: $badPath"
  }
  Write-Fixture (Join-Path $fixture 'invalid.zip') 'not an archive'
  Expect-Failure { Install-GrMetroPackageFiles (Join-Path $fixture 'invalid.zip') $installed } 'Accepted corrupt archive.'
  Write-Output 'PASS: transactional upgrade, rollback/recovery, obsolete cleanup, persistent preservation, and archive rejection.'

  Add-Type -AssemblyName PresentationFramework,PresentationCore,WindowsBase
  foreach ($file in Get-ChildItem (Join-Path $repository 'scripts/windows/*.ps1')) {
    $tokens=$null; $parseErrors=$null
    $ast=[Management.Automation.Language.Parser]::ParseFile($file.FullName,[ref]$tokens,[ref]$parseErrors)
    Assert ($parseErrors.Count -eq 0) "PowerShell parse error: $($file.Name)"
    $markup=$ast.FindAll({param($node) $node -is [Management.Automation.Language.StringConstantExpressionAst] -and $node.Value.TrimStart().StartsWith('<Window')},$true)
    foreach ($literal in $markup) {
      $xml=[xml]$literal.Value
      $window=[Windows.Markup.XamlReader]::Load((New-Object Xml.XmlNodeReader $xml))
      if ($file.Name -eq 'env-wizard.ps1') {
        foreach ($name in @('BusinessUnits','Technicians','Timezone','Autostart','ErrorText','Save','Cancel')) { Assert ($null -ne $window.FindName($name)) "Missing wizard control: $name" }
      }
      $window.Close()
    }
  }
  Write-Output 'PASS: all Windows scripts parse; WPF windows construct without being shown.'

  $wizardAst=[Management.Automation.Language.Parser]::ParseFile((Join-Path $repository 'scripts/windows/env-wizard.ps1'),[ref]$tokens,[ref]$parseErrors)
  $choiceFunction=$wizardAst.Find({param($node) $node -is [Management.Automation.Language.FunctionDefinitionAst] -and $node.Name -eq 'Get-AutostartChoice'},$true)
  Invoke-Expression $choiceFunction.Extent.Text
  Assert ((Get-AutostartChoice $true) -eq 'yes') 'Checked autostart choice was not saved as yes.'
  Assert ((Get-AutostartChoice $false) -eq 'no') 'Unchecked autostart choice was not saved as no.'
  Assert ((Get-AutostartChoice $null) -eq 'no') 'Indeterminate autostart choice must default to no.'
  Write-Output 'PASS: autostart preference defaults safely and preserves explicit checkbox state.'

  $setupAst=[Management.Automation.Language.Parser]::ParseFile((Join-Path $repository 'scripts/windows/setup-performance-center.ps1'),[ref]$tokens,[ref]$parseErrors)
  $npmFunction=$setupAst.Find({param($node) $node -is [Management.Automation.Language.FunctionDefinitionAst] -and $node.Name -eq 'Invoke-NpmCommand'},$true)
  Invoke-Expression $npmFunction.Extent.Text
  $fakeNpm=Join-Path $fixture 'npm.cmd'
  Write-Fixture $fakeNpm "@echo npm warning on stderr 1>&2`r`n@exit /b 0`r`n"
  $previousPath=$env:PATH
  try {
    $env:PATH="$fixture;$env:PATH"
    Assert ((Invoke-NpmCommand @('ci') -Quiet) -eq 0) 'Successful npm warning on stderr was treated as a setup failure.'
    Write-Fixture $fakeNpm "@echo npm failed 1>&2`r`n@exit /b 7`r`n"
    Assert ((Invoke-NpmCommand @('ci') -Quiet) -eq 7) 'Failed npm exit code was not preserved.'
  } finally {
    $env:PATH=$previousPath
  }
  Write-Output 'PASS: npm warnings do not abort setup and nonzero exit codes remain failures.'

  $nativeUiAst=[Management.Automation.Language.Parser]::ParseFile((Join-Path $repository 'scripts/windows/native-operator-ui.ps1'),[ref]$tokens,[ref]$parseErrors)
  $utf8NodeFunction=$nativeUiAst.Find({param($node) $node -is [Management.Automation.Language.FunctionDefinitionAst] -and $node.Name -eq 'Invoke-GrMetroUtf8Node'},$true)
  Invoke-Expression $utf8NodeFunction.Extent.Text
  $unicodeProbe=Join-Path $fixture 'spaced qr probe.js'
  Write-Fixture $unicodeProbe 'process.stdout.write("\u2584\u2588 QR");'
  $unicodeResult=Invoke-GrMetroUtf8Node -ScriptPath $unicodeProbe -Argument 'unused'
  $expectedUnicode=([string][char]0x2584)+([string][char]0x2588)+' QR'
  Assert ($unicodeResult -eq $expectedUnicode) 'Native QR capture corrupted UTF-8 block characters.'
  Write-Output 'PASS: native QR capture preserves UTF-8 blocks from a spaced script path.'

  # Execute the actual v2 launch functions against a harmless script in a spaced path.
  $root = $installed
  $probe = Join-Path $installed 'scripts/windows/child probe.ps1'
  Write-Fixture $probe @'
param([switch]$Probe, [switch]$SkipBuild)
[IO.File]::WriteAllText((Join-Path $PSScriptRoot 'receipt.txt'), "$Probe,$SkipBuild")
'@
  $tokens=$null; $parseErrors=$null
  $ast=[Management.Automation.Language.Parser]::ParseFile((Join-Path $repository 'scripts/windows/performance-center-launcher-v2.ps1'),[ref]$tokens,[ref]$parseErrors)
  foreach ($name in @('Run-HiddenWait','Start-Supervisor')) {
    $function=$ast.Find({param($node) $node -is [Management.Automation.Language.FunctionDefinitionAst] -and $node.Name -eq $name},$true)
    Invoke-Expression $function.Extent.Text
  }
  Assert ((Run-HiddenWait $probe @('-Probe')) -eq 0) 'Hidden worker failed in spaced installation path.'
  $receipt=Join-Path (Split-Path $probe) 'receipt.txt'
  Assert ((Get-Content -LiteralPath $receipt -Raw) -eq 'True,False') 'Hidden worker arguments changed.'
  # Wait for the asynchronous production launch so this test leaves no child process.
  function Start-Process { param($FilePath,$ArgumentList,$WorkingDirectory,$WindowStyle)
    $child=Microsoft.PowerShell.Management\Start-Process -FilePath $FilePath -ArgumentList $ArgumentList -WorkingDirectory $WorkingDirectory -WindowStyle $WindowStyle -Wait -PassThru
    Assert ($child.ExitCode -eq 0) 'Child process failed.'
  }
  function Test-Backend { return $false }
  $startScript=$probe
  Start-Supervisor
  Assert ((Get-Content -LiteralPath $receipt -Raw) -eq 'False,True') 'Supervisor path/arguments changed.'
  function Add-Activity {}
  function Update-Status {}
  $edgeScript=$probe
  $loginHandler=$ast.Find({param($node) $node -is [Management.Automation.Language.InvokeMemberExpressionAst] -and $node.Extent.Text.StartsWith('$login.Add_Click(')},$true)
  & $loginHandler.Arguments[0].ScriptBlock.GetScriptBlock()
  Assert ((Get-Content -LiteralPath $receipt -Raw) -eq 'False,False') 'Login worker path changed.'
  Write-Output 'PASS: hidden worker, supervisor and login script paths containing spaces.'
} finally {
  $cleanup=[IO.Path]::GetFullPath($fixture)
  $tempRoot=[IO.Path]::GetFullPath([IO.Path]::GetTempPath()).TrimEnd('\')
  if ([IO.Path]::GetDirectoryName($cleanup) -ne $tempRoot -or [IO.Path]::GetFileName($cleanup) -notlike 'grmetro validation *') { throw 'Unsafe fixture cleanup path.' }
  if (Test-Path -LiteralPath $cleanup) { Remove-Item -LiteralPath $cleanup -Recurse -Force }
}
