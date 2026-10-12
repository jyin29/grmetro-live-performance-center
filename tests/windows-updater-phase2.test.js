const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const root = path.resolve(__dirname, "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");

test("Phase 2 signed feed, download, handoff, and release tooling fixtures pass", { timeout: 240000 }, () => {
  const result = spawnSync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", path.join(root, "tests", "windows-updater-phase2-validation.ps1")], { cwd: root, encoding: "utf8", timeout: 235000, windowsHide: true });
  assert.equal(result.status, 0, `${result.error || ""}\n${result.stdout}\n${result.stderr}`);
  for (const evidence of ["RSA-SHA256 metadata verification", "replayed sequence", "verified download", "signed remote package", "local release tooling"]) assert.match(result.stdout, new RegExp(evidence, "i"));
});

test("Control Center update UX remains asynchronous and treats notes as plain text", () => {
  const launcher = read("scripts/windows/performance-center-launcher-v2.ps1");
  const native = read("scripts/windows/native-operator-ui.ps1");
  assert.match(launcher, /APPLICATION UPDATE/);
  assert.match(launcher, /View Changes/);
  assert.match(launcher, /Update Now/);
  assert.match(launcher, /Check for Updates/);
  assert.match(launcher, /\$updateScript=Join-Path[^\n]+update-performance-center\.ps1/);
  assert.match(launcher, /Start-Process powershell\.exe[\s\S]*\$updateScript/);
  assert.match(launcher, /DispatcherTimer/);
  assert.match(launcher, /automaticUpdateTimer[\s\S]*Start-UpdateCheck \$false/);
  assert.match(launcher, /updateNowButton\.Add_Click\(\{Start-RemoteUpdate\}\)/);
  const automaticLine = launcher.split(/\r?\n/).find((line) => line.includes("automaticUpdateTimer.Add_Tick"));
  assert.ok(automaticLine);
  assert.doesNotMatch(automaticLine, /Start-RemoteUpdate|InstallRemote/);
  assert.match(native, /Show-GrMetroTextDialog/);
  assert.doesNotMatch(launcher, /XamlReader.*releaseNotes|Invoke-Expression.*releaseNotes/i);
});

test("production update feed defaults disabled and contains no private key or credential", () => {
  const source = JSON.parse(read("scripts/windows/release-source.default.json"));
  const keys = JSON.parse(read("scripts/windows/release-public-keys.json"));
  assert.equal(source.enabled, false);
  assert.deepEqual(keys.keys, []);
  const combined = ["scripts/windows/release-source.default.json", "scripts/windows/release-public-keys.json", "scripts/windows/release-feed.ps1"].map(read).join("\n");
  assert.doesNotMatch(combined, /github_pat_|ghp_[A-Za-z0-9]{20,}|BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY/i);
});
