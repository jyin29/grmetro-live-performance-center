"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const os = require("node:os");
const path = require("node:path");
const fs = require("node:fs");
const { GoalStore, validateGoals } = require("../src/goals/goalStore");

test("goal store validates and persists authoritative goals across instances", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "grmetro-goals-"));
  const filePath = path.join(directory, "goals.json");
  const first = new GoalStore({ filePath });
  first.save({ revenue: 4000, closingRate: 62.5 });
  const restarted = new GoalStore({ filePath });
  assert.equal(restarted.getGoals().revenue, 4000);
  assert.equal(restarted.getGoals().closingRate, 62.5);
  assert.throws(() => validateGoals({ revenue: -1 }), /nonnegative/);
  assert.throws(() => validateGoals({ madeUpKpi: 1 }), /not editable/);
});
