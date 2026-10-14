"use strict";
const assert = require("node:assert/strict");
const test = require("node:test");
const { parseTechnicianConfiguration, loadTechnicianConfiguration } = require("../shared/technicianConfiguration");

const syntheticTechnicians = [
  { id: 42, name: "Taylor Example" },
  { id: "43", name: "Jordan Example", shortName: "Jordan", initials: "JE" },
];
const normalizedTechnicians = [
    { id: 42, name: "Taylor Example", shortName: "Taylor", initials: "TE" },
    { id: 43, name: "Jordan Example", shortName: "Jordan", initials: "JE" },
];

test("current array technician JSON is parsed and normalized", () => {
  assert.deepEqual(parseTechnicianConfiguration(JSON.stringify(syntheticTechnicians)), normalizedTechnicians);
});

test("PowerShell 5.1 legacy wrapper preserves array identity and order", () => {
  const legacy = JSON.stringify({ value: syntheticTechnicians, Count: syntheticTechnicians.length });
  assert.deepEqual(parseTechnicianConfiguration(legacy), normalizedTechnicians);
  assert.deepEqual(parseTechnicianConfiguration(legacy), parseTechnicianConfiguration(JSON.stringify(syntheticTechnicians)));
});

test("private technician JSON rejects malformed, empty, ambiguous, and conflicting inputs safely", () => {
  assert.throws(() => parseTechnicianConfiguration("not-json"), /valid JSON/);
  assert.throws(() => parseTechnicianConfiguration("[]"), /at least one technician/);
  assert.throws(() => parseTechnicianConfiguration(JSON.stringify({ value: [], Count: 0 })), /at least one technician/);
  assert.throws(() => parseTechnicianConfiguration(JSON.stringify({ value: syntheticTechnicians, Count: 99 })), /unsupported or inconsistent/);
  assert.throws(() => parseTechnicianConfiguration(JSON.stringify({ value: syntheticTechnicians, Count: 2, extra: true })), /unsupported or inconsistent/);
  assert.throws(() => parseTechnicianConfiguration(JSON.stringify({ technicians: syntheticTechnicians })), /unsupported or inconsistent/);
  assert.throws(() => parseTechnicianConfiguration(JSON.stringify([{ id: 1, name: "One" }, { id: 1, name: "Duplicate" }])), /duplicate/);
  const privateMarker = "Never Leak This Employee";
  assert.throws(
    () => parseTechnicianConfiguration(JSON.stringify({ value: [{ id: "invalid", name: privateMarker }], Count: 1 })),
    (error) => !error.message.includes(privateMarker) && !error.message.includes("invalid"),
  );
});

test("loader preserves a fallback for existing deployments", () => {
  const fallback = [{ id: 7, name: "Existing Technician", shortName: "Existing", initials: "ET" }];
  assert.deepEqual(loadTechnicianConfiguration({}, fallback), fallback);
});
