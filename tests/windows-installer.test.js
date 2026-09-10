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
    "Build GRMetro Installer.cmd",
  ]) assert.equal(existsSync(path.join(root, file)), true, file);
});

test("root launcher prefers generated Windows executable with safe fallback", () => {
  const source = read("GRMetro Performance Center.cmd");
  assert.match(source, /GRMetro Performance Center\.exe/);
  assert.match(source, /build-launcher-exe\.ps1/);
  assert.match(source, /performance-center-launcher\.ps1/);
});

test("control center exposes finished operator workflow", () => {
  const source = read("scripts/windows/performance-center-launcher.ps1");
  for (const label of ["Check for Updates", "Setup & Configuration", "Minimize to Tray", "RECENT ACTIVITY", "OPEN SERVICETITAN LOGIN", "VersionText"]) assert.match(source, new RegExp(label.replace(/[&]/g, "&")));
  assert.match(source, /NotifyIcon/);
  assert.match(source, /ServiceTitan-State/);
  assert.match(source, /update-performance-center\.ps1/);
});

test("first run wizard keeps deployment configuration out of source", () => {
  const source = read("scripts/windows/env-wizard.ps1");
  assert.match(source, /SERVICETITAN_BUSINESS_UNIT_IDS/);
  assert.match(source, /SERVICETITAN_TECHNICIANS_JSON/);
  assert.match(source, /Start GRMetro automatically/);
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
