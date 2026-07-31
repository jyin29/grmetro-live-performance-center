const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");

test("required repository directories exist", () => {
  for (const directory of [
    "apps/backend",
    "apps/dashboard",
    "apps/remote",
    "shared",
    "assets",
    "docs",
    "scripts"
  ]) {
    assert.equal(fs.statSync(path.join(root, directory)).isDirectory(), true, directory);
  }
});

test("root package declares the three application workspaces and required commands", () => {
  const packageJson = require(path.join(root, "package.json"));

  assert.equal(packageJson.private, true);
  assert.deepEqual(packageJson.workspaces, [
    "apps/backend",
    "apps/dashboard",
    "apps/remote"
  ]);

  for (const command of ["dev", "build", "test", "start", "generate:qr"]) {
    assert.equal(typeof packageJson.scripts[command], "string", command);
  }
});

test("required PNG assets have PNG signatures", () => {
  for (const asset of [
    "assets/branding/grmetro-logo.png",
    "assets/references/dashboard-reference.png"
  ]) {
    const signature = fs.readFileSync(path.join(root, asset)).subarray(0, 8);
    assert.deepEqual([...signature], [137, 80, 78, 71, 13, 10, 26, 10], asset);
  }
});
