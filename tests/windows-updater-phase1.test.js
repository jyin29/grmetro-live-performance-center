const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { readReleaseIdentity } = require("../apps/backend/src/releaseIdentity");

const root = path.resolve(__dirname, "..");

test("backend release identity comes from packaged deployment metadata", () => {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), "grmetro-release-identity-"));
  try {
    fs.mkdirSync(path.join(fixture, "scripts", "windows"), { recursive: true });
    fs.writeFileSync(path.join(fixture, "scripts", "windows", "package-build.json"), JSON.stringify({
      schemaVersion: 2, releaseVersion: "2026.10.6.2", releaseSequence: 202610060002,
      channel: "testing", commit: "abcdef1", builtAt: "2026-10-06T12:00:00Z", updaterProtocol: 1
    }));
    const identity = readReleaseIdentity({ root: fixture, fallbackVersion: "1.0.0" });
    assert.equal(identity.applicationVersion, "2026.10.6.2");
    assert.equal(identity.buildVersion, "abcdef1");
  } finally { fs.rmSync(fixture, { recursive: true, force: true }); }
});

test("Phase 1 external updater transaction and recovery fixtures pass", { timeout: 180000 }, () => {
  const result = spawnSync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", path.join(root, "tests", "windows-updater-phase1-validation.ps1")], {
    cwd: root, encoding: "utf8", timeout: 175000
  });
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.match(result.stdout, /PASS: external native Update Host waits for handoff, rolls back validation failure, rejects downgrade/);
  assert.match(result.stdout, /PASS: prepared\/applying\/applied\/completed power-loss states/);
});
