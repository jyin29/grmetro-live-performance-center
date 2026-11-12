const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = path.resolve(__dirname, "..");

test("Windows release publisher is ordered, resumable, and rollback-safe", { timeout: 90000 }, () => {
  const result = spawnSync(
    "powershell.exe",
    ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", path.join(root, "tests", "windows-release-publisher-validation.ps1")],
    { cwd: root, encoding: "utf8", windowsHide: true, timeout: 85000 }
  );
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.match(result.stdout, /PASS: version selection/);
});
