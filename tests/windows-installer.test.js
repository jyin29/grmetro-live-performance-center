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
  assert.match(source, /C:\\edge-dashboard-profile/);
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
  assert.match(source, /IsChecked="False"/);
  assert.match(source, /Get-AutostartChoice \$auto\.IsChecked/);
  assert.match(source, /\$isChecked -eq \$true/);
  assert.doesNotMatch(source, /password\s*=|secret\s*=/i);
});

test("updater validates before requesting recovery restart", () => {
  const source = read("scripts/windows/update-performance-center.ps1");
  const testIndex = source.indexOf("npm test");
  const buildIndex = source.indexOf("npm run build");
  const restartIndex = source.indexOf("full-recovery");
  assert.ok(testIndex >= 0 && buildIndex > testIndex && restartIndex > buildIndex);
  assert.match(source, /git pull --ff-only/);
});

test("installer creates desktop and Start Menu launch points and supports autostart", () => {
  const source = read("scripts/windows/install-grmetro-performance-center.ps1");
  assert.match(source, /Microsoft\\Windows\\Start Menu\\Programs\\GRMetro/);
  assert.match(source, /Desktop/);
  assert.match(source, /install-performance-center-autostart\.ps1/);
  assert.match(source, /GRMetro Performance Center\.exe/);
});

test("installer reports setup failures in a native error dialog", () => {
  const source = read("scripts/windows/install-grmetro-performance-center.ps1");
  assert.match(source, /try\s*\{/);
  assert.match(source, /catch\s*\{/);
  assert.match(source, /GRMetro Setup Failed/);
  assert.match(source, /MessageBoxIcon\]::Error/);
  assert.match(source, /No autostart task was created/);
  assert.match(source, /\$setupOutput=@\(& powershell\.exe/);
  assert.match(source, /Select-Object -Last 8/);
});

test("setup identifies dependency, build, and test failures", () => {
  const source = read("scripts/windows/setup-performance-center.ps1");
  assert.match(source, /function Invoke-NpmCommand/);
  assert.match(source, /\$exitCode=\$LASTEXITCODE/);
  assert.match(source, /\$ErrorActionPreference="Continue"/);
  assert.match(source, /Dependency installation failed \(npm ci exit code/);
  assert.match(source, /Dashboard build failed \(npm run build exit code/);
  assert.match(source, /Test suite failed \(npm test exit code/);
});

test("setup EXE embeds installer script and package without IExpress", () => {
  const source = read("scripts/windows/build-installer.ps1");
  assert.match(source, /GRMetroInstallerScript/);
  assert.match(source, /GRMetroInstallerPackage/);
  assert.match(source, /GetManifestResourceStream/);
  assert.match(source, /\/target:winexe/);
  assert.match(source, /GRMetro Performance Center Setup\.exe/);
  assert.match(source, /csc\.exe/);
  assert.doesNotMatch(source, /iexpress\.exe/i);
});
