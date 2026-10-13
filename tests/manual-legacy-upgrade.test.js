const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = path.resolve(__dirname, "..");

test("legacy production identity and ServiceTitan profile compatibility fixtures pass", { timeout: 180_000 }, () => {
  const result = spawnSync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", path.join(root, "tests", "windows-manual-legacy-upgrade-validation.ps1")], {
    cwd: root,
    encoding: "utf8",
    timeout: 170_000,
    windowsHide: true,
  });
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.match(result.stdout, /legacy identity upgrade validates before mutation/);
  assert.match(result.stdout, /profile selection preserves established legacy or modern profiles/);
});
