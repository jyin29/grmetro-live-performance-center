"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { periodRange, PERIOD_VALUES } = require("../src/refresh/refreshScheduler");
const { describeReportingPeriod, workingDates } = require("../src/reporting/reportingPeriods");

const NOW = new Date("2026-01-15T15:00:00.000Z");
const EXPECTED = {
  today:["2026-01-15","2026-01-15"], yesterday:["2026-01-14","2026-01-14"],
  wtd:["2026-01-12","2026-01-15"], "last-week":["2026-01-05","2026-01-11"],
  mtd:["2026-01-01","2026-01-15"], "last-month":["2025-12-01","2025-12-31"],
  qtd:["2026-01-01","2026-01-15"], "last-quarter":["2025-10-01","2025-12-31"],
  ytd:["2026-01-01","2026-01-15"], "last-year":["2025-01-01","2025-12-31"],
  "last-7-days":["2026-01-09","2026-01-15"], "last-30-days":["2025-12-17","2026-01-15"]
};

test("every reporting period has the correct Detroit calendar range and display metadata", () => {
  assert.equal(PERIOD_VALUES.length, 12);
  for (const period of PERIOD_VALUES) {
    const range = periodRange(NOW, "America/Detroit", period);
    assert.deepEqual([range.from, range.to], EXPECTED[period], period);
    const presentation = describeReportingPeriod(range);
    assert.equal(presentation.id, period);
    assert.ok(presentation.label && presentation.shortLabel && presentation.dateRangeLabel, period);
    assert.equal(presentation.workingDayCount, workingDates(range).length, period);
  }
});

test("working-day aggregation honors configured weekdays and explicit calendar exceptions", () => {
  const range = { period:"last-7-days", from:"2026-01-09", to:"2026-01-15" };
  assert.deepEqual(workingDates(range), ["2026-01-09","2026-01-12","2026-01-13","2026-01-14","2026-01-15"]);
  assert.deepEqual(workingDates(range, {
    workingWeekdays:[1,2,3,4,5], excludedDates:["2026-01-12"], includedDates:["2026-01-10"]
  }), ["2026-01-09","2026-01-10","2026-01-13","2026-01-14","2026-01-15"]);
});
