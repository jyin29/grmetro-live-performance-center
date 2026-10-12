const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");

function technicianIdentityMarkers(relative) {
  const source = read(relative);
  const records = [...source.matchAll(/\{\s*id:\s*(\d+),\s*name:\s*"([^"]+)"/g)];
  assert.ok(records.length > 0, `${relative} must expose reviewable technician fallback records.`);
  return records.flatMap((match) => [match[1], match[2]]);
}

function privateTechnicianIdentityMarkers() {
  const publicMarkers = new Set(technicianIdentityMarkers("scripts/deployment-technicians.js"));
  const privateMarkers = technicianIdentityMarkers("shared/technicians.js").filter((value) => !publicMarkers.has(value));
  assert.ok(privateMarkers.length > 0, "Canonical and deployment-safe technician identities must remain distinct.");
  return privateMarkers;
}

test("Cloudflare staging source matches the signed-feed policy", () => {
  const source = JSON.parse(read("scripts/windows/release-source.cloudflare-staging.json"));
  const origin = "https://grmetro-updates.grmetroheatingandcooling.workers.dev";
  assert.equal(source.enabled, true);
  assert.equal(source.channel, "testing");
  assert.equal(source.metadataUrl, `${origin}/staging/release.json`);
  assert.equal(source.signatureUrl, `${origin}/staging/release.json.sig`);
  assert.deepEqual(source.allowedHosts, ["grmetro-updates.grmetroheatingandcooling.workers.dev"]);
  for (const value of [source.metadataUrl, source.signatureUrl]) {
    const url = new URL(value);
    assert.equal(url.protocol, "https:");
    assert.equal(url.username, "");
    assert.equal(url.password, "");
  }
});

test("release tooling emits the Worker-compatible immutable ZIP name", () => {
  const source = read("scripts/windows/create-windows-release.ps1");
  assert.match(source, /grmetro-performance-center-\$Version\.zip/);
  assert.doesNotMatch(source, /GRMetro-Performance-Center-\$Version\.zip/);
});

test("public application packaging removes private employee fallbacks and internal docs", () => {
  const build = read("scripts/windows/build-installer.ps1");
  const dashboard = read("apps/dashboard/src/components/TechnicianGoalCustomization.jsx");
  assert.match(build, /deployment-technicians\.js/);
  assert.match(build, /deployment-goals\.js/);
  for (const pathName of ["AGENTS.md", "README.md", "docs", "assets\\references"]) assert.match(build, new RegExp(pathName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(dashboard, /FALLBACK_TECHNICIANS=\[\]/);
  for (const marker of privateTechnicianIdentityMarkers()) assert.equal(dashboard.includes(marker), false, "Dashboard source exposes a canonical private technician identity.");
});
