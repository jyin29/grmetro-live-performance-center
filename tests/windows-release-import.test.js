const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const root = path.resolve(__dirname, "..");

test("reviewed commits import without carrying dirty development work", { timeout: 60000 }, () => {
  const result = spawnSync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", path.join(root, "tests", "windows-release-import-validation.ps1")], { cwd: root, encoding: "utf8", windowsHide: true, timeout: 55000 });
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.match(result.stdout, /PASS: one-commit import/);
});
