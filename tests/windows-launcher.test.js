const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");

function source(path) {
  return readFileSync(new URL(`../${path}`, `file://${__filename}`), "utf8");
}

test("root launcher opens the GRMetro control center in one click", () => {
  const cmd = source("GRMetro Performance Center.cmd");
  assert.match(cmd, /performance-center-launcher\.ps1/);
  assert.match(cmd, /-AutoStart/);
  assert.match(cmd, /WindowStyle Hidden/);
});

test("control center handles first-run setup and supervised startup", () => {
  const launcher = source("scripts/windows/performance-center-launcher.ps1");
  assert.match(launcher, /Needs-Setup/);
  assert.match(launcher, /setup-performance-center\.ps1/);
  assert.match(launcher, /start-supervised-performance-center\.ps1/);
  assert.match(launcher, /SET UP \+ START/);
  assert.match(launcher, /START PERFORMANCE CENTER/);
  assert.match(launcher, /Test-Backend/);
});

test("control center exposes day-to-day recovery and operator shortcuts", () => {
  const launcher = source("scripts/windows/performance-center-launcher.ps1");
  for (const label of ["Open Phone Remote", "Admin Diagnostics", "Recovery Logs", "Refresh Data", "Restart Backend", "Restart ServiceTitan", "Create Desktop Shortcut"]) {
    assert.match(launcher, new RegExp(label));
  }
  assert.match(launcher, /self-healing backend|self-healing supervisor/i);
  assert.match(launcher, /Minimize to Tray/);
  assert.match(launcher, /Check for Updates/);
  assert.match(launcher, /Setup & Configuration/);
});
