"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { spawnSync } = require("node:child_process");

const root = path.resolve(__dirname, "..");
const updateScript = path.join(root, "scripts", "windows", "update-performance-center.ps1");

function invokeFixture(workerSource) {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), "grmetro-gui-update-check-"));
  const applicationScripts = path.join(fixture, "Performance Center", "scripts", "windows");
  const hostRoot = path.join(fixture, "Update Host");
  const tempRoot = path.join(fixture, "Temp");
  fs.mkdirSync(applicationScripts, { recursive: true });
  fs.mkdirSync(hostRoot, { recursive: true });
  fs.mkdirSync(tempRoot, { recursive: true });
  fs.copyFileSync(updateScript, path.join(applicationScripts, "update-performance-center.ps1"));
  fs.writeFileSync(path.join(hostRoot, "GRMetro Update Host.exe"), "synthetic host marker");
  fs.writeFileSync(path.join(hostRoot, "update-host.ps1"), workerSource);
  const result = spawnSync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", path.join(applicationScripts, "update-performance-center.ps1"), "-CheckOnly", "-UpdateHostPath", path.join(hostRoot, "GRMetro Update Host.exe")], {
    cwd: path.join(fixture, "Performance Center"),
    encoding: "utf8",
    env: { ...process.env, GRMETRO_UPDATER_TEST_MODE: "true", TEMP: tempRoot, TMP: tempRoot },
    timeout: 30000,
    windowsHide: true,
  });
  const leftovers = fs.readdirSync(tempRoot).filter((name) => name.startsWith("grmetro-update-check-worker-"));
  fs.rmSync(fixture, { recursive: true, force: true });
  return { result, leftovers };
}

test("GUI update check waits for the host worker and returns its JSON result", () => {
  const { result, leftovers } = invokeFixture("param([string]$Mode,[string]$InstallRoot,[switch]$Quiet)\nStart-Sleep -Milliseconds 250\n[ordered]@{status='up-to-date';current='2026.10.21.2';latest='2026.10.8.1';updateAvailable=$false}|ConvertTo-Json -Compress\n");
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.deepEqual(JSON.parse(result.stdout.trim()), { status: "up-to-date", current: "2026.10.21.2", latest: "2026.10.8.1", updateAvailable: false, versionHistory: [], restoreVersionSupported: false });
  assert.deepEqual(leftovers, []);
});

test("GUI update check surfaces a sanitized worker failure and removes temporary output", () => {
  const { result, leftovers } = invokeFixture("param([string]$Mode,[string]$InstallRoot,[switch]$Quiet)\n[Console]::Error.WriteLine('SANITIZED FEED FAILURE')\nexit 7\n");
  assert.equal(result.status, 1);
  assert.match(result.stderr, /GRMetro Update Host could not check the configured release source\. SANITIZED FEED FAILURE/);
  assert.deepEqual(leftovers, []);
});

test("application check bridge never treats the GUI host executable as a stdout CLI", () => {
  const source = fs.readFileSync(updateScript, "utf8");
  assert.match(source, /Start-Process -FilePath powershell\.exe/);
  assert.match(source, /-RedirectStandardOutput \$stdout -RedirectStandardError \$stderr -PassThru -Wait/);
  assert.doesNotMatch(source, /& \$UpdateHostPath -Mode Check/);
  assert.match(fs.readFileSync(path.join(root, "scripts", "windows", "build-update-host.ps1"), "utf8"), /target:winexe/);
});
