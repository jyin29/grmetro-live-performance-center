"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("Control Center history is limited to installed and cryptographically verified release identities", () => {
  const bridge = read("scripts/windows/update-performance-center.ps1");
  assert.match(bridge, /trust-state\.json/);
  assert.match(bridge, /Get-GrMetroInstalledReleaseMetadata/);
  assert.match(bridge, /\$CheckResult\.metadata\.releaseVersion/);
  assert.match(bridge, /versionHistory/);
  assert.match(bridge, /restoreVersionSupported[^\r\n]*\$false/);
  assert.doesNotMatch(bridge, /\?\./);
});

test("Control Center shows honest history and does not expose an unimplemented restore action", () => {
  const ui = read("scripts/windows/performance-center-launcher-v2.ps1");
  assert.match(ui, /VersionHistoryButton/);
  assert.match(ui, /\$script:releaseHistory=@\(\$result\.versionHistory\)/);
  assert.match(ui, /Release notes unavailable for this verified version/);
  assert.match(ui, /Restore Version is not available yet\. Automatic failed-update rollback remains active\./);
  assert.doesNotMatch(ui, /RestoreVersionButton/);
});
