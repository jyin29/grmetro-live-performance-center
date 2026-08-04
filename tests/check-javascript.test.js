"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const script = path.resolve(__dirname, "../scripts/check-javascript.js");

function createFixture(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "grmetro syntax check "));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  return directory;
}

function run(target) {
  return spawnSync(process.execPath, [script, target], { encoding: "utf8" });
}

test("JavaScript checker accepts valid files in paths containing spaces", (t) => {
  const target = createFixture(t);
  fs.writeFileSync(path.join(target, "valid file.js"), '"use strict";\nconst value = 1;\n');

  const result = run(target);

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /passed for 1 file/);
});

test("JavaScript checker recursively scans nested folders", (t) => {
  const target = createFixture(t);
  const nested = path.join(target, "nested folder", "deeper");
  fs.mkdirSync(nested, { recursive: true });
  fs.writeFileSync(path.join(target, "root.js"), '"use strict";\n');
  fs.writeFileSync(path.join(nested, "nested.js"), "module.exports = true;\n");
  fs.writeFileSync(path.join(nested, "ignored.txt"), "not JavaScript {");

  const result = run(target);

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /passed for 2 file/);
});

test("JavaScript checker fails and identifies an invalid nested file", (t) => {
  const target = createFixture(t);
  const nested = path.join(target, "nested folder");
  fs.mkdirSync(nested);
  const invalidFile = path.join(nested, "invalid file.js");
  fs.writeFileSync(invalidFile, "const broken = ;\n");

  const result = run(target);

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /JavaScript syntax check failed:/);
  assert.match(result.stderr, new RegExp(invalidFile.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
});

test("JavaScript checker fails clearly for a missing target directory", (t) => {
  const target = path.join(createFixture(t), "missing folder");

  const result = run(target);

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /target directory does not exist:/);
  assert.match(result.stderr, /missing folder/);
});
