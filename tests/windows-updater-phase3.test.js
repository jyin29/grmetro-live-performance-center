const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const root = path.resolve(__dirname, "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");

test("Phase 3 launch migration, trust provisioning, and signing integration fixtures pass", { timeout: 180000 }, () => {
  const result = spawnSync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", path.join(root, "tests", "windows-updater-phase3-validation.ps1")], { cwd: root, encoding: "utf8", timeout: 175000, windowsHide: true });
  assert.equal(result.status, 0, `${result.error || ""}\n${result.stdout}\n${result.stderr}`);
  for (const evidence of ["scheduled startup migrate", "recovery precedes launch", "Authenticode fails closed", "public fingerprint", "Setup provisioning"]) assert.match(result.stdout, new RegExp(evidence, "i"));
});

test("routine application updater cannot replace its external Update Host", () => {
  const host = read("scripts/windows/update-host.ps1");
  assert.match(host, /requires a newer GRMetro Setup/);
  assert.doesNotMatch(host, /Copy-Item[^\n]+Update Host|Move-Item[^\n]+Update Host/i);
  const migration = read("scripts/windows/install-update-host.ps1");
  assert.match(migration, /Install-GrMetroStableUpdateHost/);
  assert.match(migration, /Save-GrMetroLaunchIntegrationState/);
  assert.match(migration, /Get-GrMetroReleaseCheck[^\n]+-ReadOnly/);
});

test("production trust defaults stay disabled without explicit migration provisioning", () => {
  const source = JSON.parse(read("scripts/windows/release-source.default.json"));
  const keys = JSON.parse(read("scripts/windows/release-public-keys.json"));
  assert.equal(source.enabled, false);
  assert.equal(keys.keys.length, 0);
  const template = read("scripts/windows/release-source.production.template.json");
  assert.match(template, /__REQUIRED_HTTPS_RELEASE_JSON_URL__/);
  assert.doesNotMatch(template, /example\.com/i);
});

test("normal launch integration targets the stable host", () => {
  const integration = read("scripts/windows/launch-integration.ps1");
  const installer = read("scripts/windows/install-grmetro-performance-center.ps1");
  const autostart = read("scripts/windows/install-performance-center-autostart.ps1");
  assert.match(integration, /GRMetro Update Host\.exe/);
  assert.match(integration, /Arguments='-Mode Launch'/);
  assert.match(integration, /New-ScheduledTaskAction -Execute \$paths\.HostExecutable -Argument '-Mode Launch'/);
  assert.match(installer, /Save-GrMetroLaunchIntegrationState/);
  assert.match(installer, /update-host-installation\.ps1/);
  assert.match(installer, /Restore-GrMetroLaunchIntegration/);
  assert.match(autostart, /Register-GrMetroHostAutostart/);
});
