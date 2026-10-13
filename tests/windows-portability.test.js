const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");

test("installed runtime resolves the packaged Node executable without PATH", () => {
  const runtimePaths = read("scripts/windows/runtime-paths.ps1");
  assert.match(runtimePaths, /runtime\\node\\node\.exe/);
  assert.match(runtimePaths, /Get-GrMetroNodePath/);

  const activeScripts = [
    "scripts/windows/setup-performance-center.ps1",
    "scripts/windows/start-supervised-performance-center.ps1",
    "scripts/windows/start-performance-center.ps1",
    "scripts/windows/performance-center-supervisor.ps1",
    "scripts/windows/performance-center-launcher-v2.ps1",
    "scripts/windows/native-operator-ui.ps1",
  ].map(read).join("\n");
  assert.doesNotMatch(activeScripts, /Get-Command\s+node|Start-Process\s+-FilePath\s+["']node["']|&\s*node\b/i);
  assert.doesNotMatch(activeScripts, /npm(?:\.cmd)?\s+(?:ci|install|run|test)\b/i);
  assert.match(activeScripts, /Get-GrMetroNodePath|Test-GrMetroPortableRuntime/);
});

test("portable target setup uses packaged frontend and production dependencies", () => {
  const setup = read("scripts/windows/setup-performance-center.ps1");
  for (const required of [
    "apps\\dashboard\\dist\\index.html",
    "node_modules\\express\\package.json",
    "node_modules\\playwright\\package.json",
    "node_modules\\qrcode-terminal\\package.json",
  ]) assert.ok(setup.includes(required), `missing portable payload check: ${required}`);
  assert.doesNotMatch(setup, /npm\s|npm\.cmd|git\s|npm run build|npm test|csc\.exe/i);
});

test("portable package keeps browser sessions and machine data outside its manifest", () => {
  const manifest = JSON.parse(read("scripts/windows/package-manifest.json"));
  const names = manifest.files.join("\n");
  assert.match(names, /scripts\/windows\/runtime-paths\.ps1/);
  assert.match(names, /scripts\/windows\/runtime-versions\.json/);
  assert.match(names, /scripts\/windows\/process-control\.ps1/);
  assert.match(names, /scripts\/windows\/application-validation\.ps1/);
  assert.match(names, /scripts\/windows\/release-identity\.ps1/);
  assert.ok(manifest.files.every((name) => name === ".env.example" || !/^(\.env(?:\.|$)|data\/|logs\/|node_modules\/|apps\/dashboard\/dist\/)/i.test(name)));
  assert.doesNotMatch(names, /cookie|storage-state|auth-state|session/i);
});

test("Edge prerequisite and LAN firewall behavior are explicit", () => {
  const edge = read("scripts/windows/launch-edge.ps1");
  const profile = read("scripts/windows/servicetitan-profile.ps1");
  const wizard = read("scripts/windows/env-wizard.ps1");
  const installer = read("scripts/windows/install-grmetro-performance-center.ps1");
  assert.match(edge, /Microsoft Edge is required/);
  assert.match(edge, /Resolve-GrMetroServiceTitanProfilePath/);
  assert.match(profile, /C:\\edge-dashboard-profile/);
  assert.match(profile, /LOCALAPPDATA.*GRMetro\\Edge Profile/);
  assert.match(wizard, /Allow phones and TVs on my private network/);
  assert.match(installer, /configure-private-firewall\.ps1/);
  assert.match(installer, /-Verb RunAs/);
});
