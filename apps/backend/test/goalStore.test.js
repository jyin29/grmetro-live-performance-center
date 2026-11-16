"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const os = require("node:os");
const path = require("node:path");
const fs = require("node:fs");
const { GoalStore, validateGoals } = require("../src/goals/goalStore");
const { periodRange, PERIOD_VALUES } = require("../src/refresh/refreshScheduler");

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

test("daily goals aggregate across each reporting period unless a dedicated target exists", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "grmetro-period-goals-"));
  const filePath = path.join(directory, "goals.json");
  const store = new GoalStore({ filePath });
  const technicianId = "134926818";
  store.save({ periods:{
    today:{ defaults:{ revenue:100, closingRate:60, installAverageTicket:8000 }, technicians:{ [technicianId]:{ revenue:120 } } },
    mtd:{ defaults:{ revenue:5000 }, technicians:{ [technicianId]:{ revenue:5500 } } }
  }});
  const now = new Date("2026-01-15T15:00:00.000Z");
  for (const period of PERIOD_VALUES) {
    const range = periodRange(now, "America/Detroit", period);
    const goals = store.getGoals(period, range);
    if (period === "mtd") {
      assert.equal(goals.revenue, 5000);
      assert.equal(goals.technicians[technicianId].revenue, 5500);
      assert.equal(goals.goalSources.defaults.revenue, "dedicated");
    } else {
      assert.equal(goals.revenue, 100 * goals.workingDayCount, period);
      assert.equal(goals.technicians[technicianId].revenue, 120 * goals.workingDayCount, period);
      assert.equal(goals.goalSources.defaults.revenue, period === "today" ? "dedicated" : "daily-aggregate", period);
    }
    assert.equal(goals.closingRate, 60, period);
    assert.equal(goals.installAverageTicket, 8000, period);
  }
});

test("goal schedules reject malformed or ambiguous calendar configuration", () => {
  assert.throws(() => validateGoals({ schedule:{ workingWeekdays:[1,1] }, periods:{} }), /unique integers/);
  assert.throws(() => validateGoals({ schedule:{ workingWeekdays:[1,2,3], includedDates:["not-a-date"] }, periods:{} }), /YYYY-MM-DD/);
});
