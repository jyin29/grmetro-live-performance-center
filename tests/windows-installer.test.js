const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync, existsSync } = require("node:fs");
const path = require("node:path");
const root = path.join(__dirname, "..");
const read = (p) => readFileSync(path.join(root, p), "utf8");

test("native launcher and installer build scripts are present", () => {
  for (const file of [
    "scripts/windows/build-launcher-exe.ps1",
    "scripts/windows/build-installer.ps1",
    "scripts/windows/install-grmetro-performance-center.ps1",
    "scripts/windows/env-wizard.ps1",
    "scripts/windows/update-performance-center.ps1",
    "scripts/windows/performance-center-launcher-host.ps1",
    "scripts/windows/stop-performance-center.ps1",
    "Build GRMetro Installer.cmd",
  ]) assert.equal(existsSync(path.join(root, file)), true, file);
});

test("root launcher prefers generated Windows executable with crash-safe fallback", () => {
  const source = read("GRMetro Performance Center.cmd");
  assert.match(source, /GRMetro Performance Center\.exe/);
  assert.match(source, /build-launcher-exe\.ps1/);
  assert.match(source, /performance-center-launcher-host\.ps1/);
  assert.match(source, /-STA/);
});

test("control center exposes finished operator workflow", () => {
  const source = read("scripts/windows/performance-center-launcher-v2.ps1");
  for (const label of ["Check for Updates", "Minimize", "LIVE ACTIVITY", "OPEN SERVICETITAN LOGIN", "VersionText", "STOP PERFORMANCE CENTER"]) assert.match(source, new RegExp(label));
  assert.match(source, /Setup &amp; Configuration/);
  assert.match(source, /xmlns:x="http:\/\/schemas\.microsoft\.com\/winfx\/2006\/xaml"/);
  assert.match(source, /\$window\.WindowState='Minimized'/);
  assert.match(source, /ST-State/);
  assert.match(source, /Confirm-GrMetroAction 'Stop GRMetro'/);
  assert.match(source, /Run-HiddenWait \$stopScript/);
  assert.match(source, /update-performance-center\.ps1/);
  assert.match(source, /stop-performance-center\.ps1/);
});

test("native Phone Remote captures QR output as explicit UTF-8", () => {
  const source = read("scripts/windows/native-operator-ui.ps1");
  assert.match(source, /function Invoke-GrMetroUtf8Node/);
  assert.match(source, /StandardOutputEncoding=\$utf8/);
  assert.match(source, /StandardErrorEncoding=\$utf8/);
  assert.match(source, /CreateNoWindow=\$true/);
  assert.match(source, /Invoke-GrMetroUtf8Node -ScriptPath \$qrScript/);
  assert.match(source, /if\(\$TerminalPalette\)\{\$box\.Background="#111827";\$box\.Foreground="White"\}/);
  assert.match(source, /-Text \$text -TerminalPalette/);
  assert.match(source, /GRMETRO PERFORMANCE CENTER/);
  assert.match(source, /Secure local access from the native control center/);
  assert.match(source, /\$header\.Background='#172033'/);
});

test("native diagnostics and recovery logs use readable status views", () => {
  const source = read("scripts/windows/native-operator-ui.ps1");
  for (const label of ["System health at a glance", "SERVICETITAN BROWSER", "DASHBOARD CACHE", "TV DISPLAYS", "Supervisor activity", "RECOVERY CENTER"]) {
    assert.match(source, new RegExp(label));
  }
  assert.match(source, /\$data\.diagnostics\.cacheAvailable/);
  assert.match(source, /Recovery level \$level/);
  assert.doesNotMatch(source, /\$data\|ConvertTo-Json/);
  assert.doesNotMatch(source, /Show-GrMetroTextDialog -Title "GRMetro Diagnostics"/);
  assert.doesNotMatch(source, /Show-GrMetroTextDialog -Title "GRMetro Recovery Logs"/);
});

test("operator stop kills only GRMetro supervisor, backend, and dedicated Edge", () => {
  const source = read("scripts/windows/stop-performance-center.ps1");
  assert.match(source, /performance-center-supervisor\\\.ps1/);
  assert.match(source, /apps\[\\\\\/\]backend/);
  assert.match(source, /LOCALAPPDATA.*GRMetro\\Edge Profile/);
  assert.match(source, /\$_.CommandLine -like "\*\$profile\*"/);
  assert.match(source, /if\(-not \$KeepServiceTitanBrowser\)/);
  assert.match(source, /Stop-Process/);
  assert.doesNotMatch(source, /Get-Process\s+node\s*\|\s*Stop-Process/i);
});

test("first run wizard keeps deployment configuration out of source", () => {
  const source = read("scripts/windows/env-wizard.ps1");
  assert.match(source, /SERVICETITAN_BUSINESS_UNIT_IDS/);
  assert.match(source, /SERVICETITAN_TECHNICIANS_JSON/);
  assert.match(source, /Start GRMetro automatically/);
  assert.match(source, /Allow phones and TVs on my private network/);
  assert.match(source, /IsChecked="False"/);
  assert.match(source, /Get-AutostartChoice \$auto\.IsChecked/);
  assert.match(source, /\$isChecked -eq \$true/);
  assert.doesNotMatch(source, /password\s*=|secret\s*=/i);
});

test("packaged updater delegates checks, remote handoff, and local fixtures to the stable host without Git or npm", () => {
  const source = read("scripts/windows/update-performance-center.ps1");
  assert.match(source, /GRMetro\\Update Host\\GRMetro Update Host\.exe/);
  assert.match(source, /-Mode','ApplyLocal'/);
  assert.match(source, /-Mode','PrepareRemote'/);
  assert.match(source, /-Mode Check/);
  assert.match(source, /\$InstallRemote/);
  assert.doesNotMatch(source, /\bgit\b|\bnpm\b/i);
});

test("installer creates desktop and Start Menu launch points and supports autostart", () => {
  const source = read("scripts/windows/install-grmetro-performance-center.ps1");
  const integration = read("scripts/windows/launch-integration.ps1");
  assert.match(integration, /Microsoft\\Windows\\Start Menu\\Programs\\GRMetro/);
  assert.match(integration, /Desktop/);
  assert.match(integration, /Register-GrMetroHostAutostart/);
  assert.match(integration, /GRMetro Update Host\.exe/);
  assert.match(source, /Set-GrMetroLaunchIntegration/);
  assert.match(source, /Restore-GrMetroLaunchIntegration/);
});

test("installer reports setup failures in a native error dialog", () => {
  const source = read("scripts/windows/install-grmetro-performance-center.ps1");
  assert.match(source, /try\s*\{/);
  assert.match(source, /catch\s*\{/);
  assert.match(source, /GRMetro Setup Failed/);
  assert.match(source, /MessageBoxIcon\]::Error/);
  assert.match(source, /No autostart task was created/);
  assert.match(source, /incomplete application transaction remains/);
  assert.doesNotMatch(source, /No application rollback was required/);
  assert.match(source, /Install-GrMetroPackageFiles[^\r\n]+-DeferCommitCleanup/);
  assert.match(source, /Invoke-GrMetroPowerShellScript[^\r\n]+-Sta/);
  assert.match(source, /Format-GrMetroScriptFailure/);
  assert.match(source, /Restore-GrMetroUpgradeTransaction/);
  assert.match(source, /Complete-GrMetroUpgradeTransaction/);
});

test("upgrade inventory supports version-to-version file additions with verified rollback journals", () => {
  const source = read("scripts/windows/package-files.ps1");
  assert.match(source, /function Get-GrMetroManifestFiles/);
  assert.match(source, /Read-GrMetroInstalledPackageFiles[\s\S]*Get-GrMetroManifestFiles/);
  assert.match(source, /version = 2; status = 'prepared'/);
  assert.match(source, /\$journal\.status\s*=\s*'applying'/);
  assert.match(source, /\$journal\.status\s*=\s*'applied'/);
  assert.match(source, /backupSha256/);
  assert.match(source, /Upgrade backup checksum mismatch/);
  assert.match(source, /Get-GrMetroLegacyTransactionState/);
  assert.match(source, /Test-GrMetroLegacyInterruptedRollbackCleanup/);
  assert.match(source, /legacyState -in @\('applied','prior','prior-cleanup'\)/);
  assert.match(source, /function Test-GrMetroTransientUpgradeCleanupError/);
  assert.match(source, /for\(\$attempt=1;\$attempt -le \$MaximumAttempts;\$attempt\+\+\)/);
  assert.match(source, /if\(-not\(Test-Path -LiteralPath \$upgradeRoot\)\)\{return\}/);
  assert.match(source, /did not finish after \$MaximumAttempts attempts/);
});

test("upgrade releases only packaged GRMetro processes before replacement", () => {
  const source = read("scripts/windows/process-control.ps1");
  const installer = read("scripts/windows/install-grmetro-performance-center.ps1");
  assert.match(source, /function Get-GrMetroOwnedUpgradeProcesses/);
  assert.match(source, /function Stop-GrMetroUpgradeProcesses/);
  assert.match(source, /runtime\\node\\node\.exe/);
  assert.match(source, /performance-center-supervisor\\\.ps1/);
  assert.match(source, /performance-center-launcher-\(\?:host\|v2\)\\\.ps1/);
  assert.match(source, /Stop-ScheduledTask -TaskName 'GRMetro Live Performance Center Supervisor'/);
  assert.ok(installer.indexOf("Get-GrMetroUpgradeRecoveryAction $installRoot") < installer.indexOf("Stop-GrMetroUpgradeProcesses $installRoot"));
  assert.ok(installer.indexOf("Restore-GrMetroUpgradeTransaction $installRoot") < installer.indexOf("Stop-GrMetroUpgradeProcesses $installRoot"));
  assert.ok(installer.indexOf("Stop-GrMetroUpgradeProcesses $installRoot") < installer.indexOf("Install-GrMetroPackageFiles -PackageZip"));
  assert.match(source, /Restart-GrMetroAfterFailedUpgrade/);
  assert.doesNotMatch(source, /Stop-Process[^\r\n]+msedge|GRMetro\\Edge Profile/);
});

test("target setup validates the bundled runtime and never installs or builds dependencies", () => {
  const source = read("scripts/windows/setup-performance-center.ps1");
  assert.match(source, /Get-GrMetroNodePath/);
  assert.match(source, /apps\\dashboard\\dist\\index\.html/);
  assert.match(source, /node_modules\\playwright\\package\.json/);
  assert.match(source, /launch-edge\.ps1.*-CheckOnly/);
  assert.doesNotMatch(source, /npm(?:\.cmd)?\s+(?:ci|install|run)|npm test|build-launcher-exe|csc\.exe/i);
});

test("package build creates an isolated deterministic portable payload", () => {
  const source = read("scripts/windows/build-installer.ps1");
  assert.match(source, /npm ci --ignore-scripts/);
  assert.match(source, /npm ci --omit=dev --ignore-scripts/);
  assert.match(source, /runtime-versions\.json/);
  assert.match(source, /windowsX64Sha256/);
  assert.match(source, /-SourceState \$sourceState/);
  assert.match(source, /New-GrMetroReleaseMetadata/);
  assert.match(source, /build-update-host\.ps1/);
  assert.match(source, /Write-GrMetroPortablePackageManifest/);
  assert.match(source, /windows-portable-package-validation\.ps1/);
  assert.match(source, /apps\\dashboard\\src/);
  assert.match(source, /apps\\backend\\test/);
  assert.match(source, /scripts\\check-javascript\.js/);
  assert.match(source, /playwright-core\\lib\\tools\\skills/);
  assert.match(source, /playwright-core\\lib\\vite/);
  assert.doesNotMatch(source, /Copy-Item[^\r\n]+node_modules/i);
});

test("setup EXE embeds installer script and package without IExpress", () => {
  const source = read("scripts/windows/build-installer.ps1");
  assert.match(source, /GRMetroInstallerScript/);
  assert.match(source, /GRMetroInstallerPackage/);
  assert.match(source, /GRMetroUpdateHostPackage/);
  assert.match(source, /GRMetroProcessHelper/);
  assert.match(source, /GRMetroLaunchHelper/);
  assert.match(source, /GetManifestResourceStream/);
  assert.match(source, /\/target:winexe/);
  assert.match(source, /GRMetro Performance Center Setup\.exe/);
  assert.match(source, /csc\.exe/);
  assert.doesNotMatch(source, /iexpress\.exe/i);
});
