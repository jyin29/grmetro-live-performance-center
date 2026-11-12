"use strict";
const assert = require("node:assert/strict");
const path = require("node:path");
const test = require("node:test");
const { spawnSync } = require("node:child_process");
const root = path.resolve(__dirname, "..");

test("single-file legacy candidate upgrades and rolls back disposable fixtures", { timeout: 420000 }, () => {
  const result = spawnSync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", path.join(root, "tests", "windows-legacy-single-file-upgrade-validation.ps1")], { cwd: root, encoding: "utf8", timeout: 410000, windowsHide: true });
  assert.equal(result.status, 0, `${result.error || ""}\n${result.stdout}\n${result.stderr}`);
  assert.match(result.stdout, /exact single-file payload upgrades/i);
  assert.match(result.stdout, /injected target validation failure restores/i);
});
