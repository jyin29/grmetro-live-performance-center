"use strict";
const assert = require("node:assert/strict");
const path = require("node:path");
const test = require("node:test");
const { spawnSync } = require("node:child_process");
const root = path.resolve(__dirname, "..");
test("post-success legacy recovery preserves private state and handles interruption", { timeout: 120000 }, () => {
  const result = spawnSync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", path.join(root, "tests", "windows-post-success-recovery-validation.ps1")], { cwd: root, encoding: "utf8", timeout: 115000, windowsHide: true });
  assert.equal(result.status, 0, `${result.error || ""}\n${result.stdout}\n${result.stderr}`);
  assert.match(result.stdout, /preflight is read-only/i);assert.match(result.stdout, /private state and Update Host remain unchanged/i);assert.match(result.stdout, /interrupted recovery restore/i);
});
