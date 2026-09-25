const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");

function source(path) {
  return readFileSync(new URL(`../${path}`, `file://${__filename}`), "utf8");
}

test("root launcher opens the GRMetro control center in one click", () => {
  const cmd = source("GRMetro Performance Center.cmd");
  assert.match(cmd, /performance-center-launcher-host\.ps1/);
  assert.match(cmd, /-AutoStart/);
  assert.match(cmd, /WindowStyle Hidden/);
  assert.match(cmd, /-STA/);
});

test("launcher host makes startup failures visible and logged", () => {
  const host = source("scripts/windows/performance-center-launcher-host.ps1");
  assert.match(host, /performance-center-launcher-v2\.ps1/);
  assert.match(host, /control-center-crash\.log/);
  assert.match(host, /MessageBox/);
  assert.match(host, /CONTROL CENTER STARTUP FAILURE/);
});

test("control center handles first-run setup and supervised startup", () => {
  const launcher = source("scripts/windows/performance-center-launcher-v2.ps1");
  assert.match(launcher, /Needs-Setup/);
  assert.match(launcher, /setup-performance-center\.ps1/);
  assert.match(launcher, /start-supervised-performance-center\.ps1/);
  assert.match(launcher, /SET UP \+ START/);
  assert.match(launcher, /START PERFORMANCE CENTER/);
  assert.match(launcher, /Test-Backend/);
});

test("control center exposes day-to-day recovery and operator shortcuts", () => {
  const launcher = source("scripts/windows/performance-center-launcher-v2.ps1");
  for (const label of ["Phone Remote", "Admin Diagnostics", "Recovery Logs", "Refresh Data", "Restart Backend", "Restart ServiceTitan", "Desktop Shortcut"]) {
    assert.match(launcher, new RegExp(label));
  }
  assert.match(launcher, /self-healing active/i);
  assert.match(launcher, /Show-NativeRemoteAccess/);
  assert.match(launcher, /Show-NativeDiagnostics/);
  assert.match(launcher, /Show-NativeRecoveryLogs/);
  assert.match(launcher, /CreateShortcut/);
  assert.match(launcher, /\$window\.WindowState='Minimized'/);
  assert.match(launcher, /Check for Updates/);
  assert.match(launcher, /Setup &amp; Configuration/);
});
