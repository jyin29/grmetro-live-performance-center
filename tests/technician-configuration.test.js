"use strict";
const assert = require("node:assert/strict");
const test = require("node:test");
const { parseTechnicianConfiguration, loadTechnicianConfiguration } = require("../shared/technicianConfiguration");

test("private technician JSON is parsed and normalized", () => {
  const value = JSON.stringify([{ id: 42, name: "Taylor Example" }, { id: "43", name: "Jordan Example", shortName: "Jordan", initials: "JE" }]);
  const technicians = parseTechnicianConfiguration(value);
  assert.deepEqual(technicians, [
    { id: 42, name: "Taylor Example", shortName: "Taylor", initials: "TE" },
    { id: 43, name: "Jordan Example", shortName: "Jordan", initials: "JE" }
  ]);
});

test("private technician JSON rejects invalid and duplicate IDs", () => {
  assert.throws(() => parseTechnicianConfiguration("not-json"), /valid JSON/);
  assert.throws(() => parseTechnicianConfiguration("[]"), /non-empty array/);
  assert.throws(() => parseTechnicianConfiguration(JSON.stringify([{ id: 1, name: "One" }, { id: 1, name: "Duplicate" }])), /duplicate/);
});

test("loader preserves a fallback for existing deployments", () => {
  const fallback = [{ id: 7, name: "Existing Technician", shortName: "Existing", initials: "ET" }];
  assert.deepEqual(loadTechnicianConfiguration({}, fallback), fallback);
});
