"use strict";

const assert = require("node:assert/strict");
const path = require("node:path");
const test = require("node:test");
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");

const root = path.resolve(__dirname, "..");

test("host-only migration is transactional and preserves application state", { timeout: 120000 }, () => {
  const result = spawnSync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", path.join(root, "tests", "windows-update-host-migration-validation.ps1")], { cwd: root, encoding: "utf8", timeout: 115000, windowsHide: true });
  assert.equal(result.status, 0, `${result.error || ""}\n${result.stdout}\n${result.stderr}`);
  assert.match(result.stdout, /provisions trust.+preserves the application/i);
  assert.match(result.stdout, /gates fail closed/i);
});

test("host-only migration never controls the dashboard backend or Edge", () => {
  const source = fs.readFileSync(path.join(root, "scripts/windows/install-update-host.ps1"), "utf8");
  assert.doesNotMatch(source, /Stop-GrMetroUpgradeProcesses|Start-GrMetroInstalledApplication|launch-edge|msedge|edge-dashboard-profile/i);
  assert.match(source, /\.grmetro-autostart-choice/);
  assert.match(source, /Get-GrMetroUpgradeRecoveryAction/);
  assert.match(source, /ConfirmUnsignedInternalHost/);
});
