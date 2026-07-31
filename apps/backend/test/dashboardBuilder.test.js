"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const technicians = require("../../../shared/technicians");
const kpis = require("../../../shared/kpis");
const overallScore = require("../../../shared/overallScore");
const { normalizeServiceTitanTechnician } = require("../src/data/normalization");
const { buildDashboardPayload } = require("../src/data/dashboardBuilder");

const ids = Object.keys(kpis);
const goals = { defaults: Object.fromEntries(ids.map((id) => [id, kpis[id].format === "percentage" ? 50 : 10])), technicians: {} };

function records() {
  return technicians.map((technician, index) => normalizeServiceTitanTechnician({ TechnicianId: technician.id, phoneNumber: "never-copy" }, {
    mockValues: Object.fromEntries(ids.map((id, metricIndex) => [id, index === 4 && id === "serviceRevenue" ? null : (index + 1) * 10 + metricIndex]))
  }));
}

test("dashboard builder emits deterministic, fully prepared five-slide presentation data", () => {
  const options = { now: "2026-01-15T15:00:00Z", rotationEpoch: "2026-01-15T05:00:00Z", goals, overallScore };
  const payload = buildDashboardPayload(records(), options);
  assert.deepEqual(Object.keys(payload.slides), ["revenue", "activity", "performance", "average-ticket", "top-three"]);
  assert.equal(payload.technicians.length, 5);
  assert.equal(payload.overallTopThree.length, 3);
  for (const slideId of ["revenue", "activity", "performance", "average-ticket"]) {
    assert.equal(Object.hasOwn(payload.slides[slideId], "entries"), false);
    assert.equal(payload.slides[slideId].rows.length, 5);
    assert.equal(payload.slides[slideId].rows.every((row) => row.metrics.every((metric) => Object.hasOwn(metric, "rank") && Object.hasOwn(metric, "goal") && Object.hasOwn(metric, "normalizedRatio"))), true);
  }
  assert.equal(payload.slides.performance.axis.maximum, 100);
  assert.deepEqual(buildDashboardPayload(records(), options), payload);
  const serialized = JSON.stringify(payload);
  for (const forbidden of ["TechnicianId", "CompletedRevenue", "CloseRate", "phoneNumber", "never-copy"]) assert.equal(serialized.includes(forbidden), false);
  assert.equal(Object.hasOwn(payload.technicians[0].overall, "score"), false);
});

test("no-data remains distinct from zero and Top 3 uses neutral placeholders", () => {
  const sparse = records().map((record, index) => ({ ...record, kpis: Object.fromEntries(Object.entries(record.kpis).map(([id, metric]) => [id,
    { ...metric, value: index === 0 ? 0 : null, hasData: index === 0, dataQuality: index === 0 ? "fallback" : "unavailable" }
  ])) }));
  const payload = buildDashboardPayload(sparse, { now: "2026-01-15T15:00:00Z", goals,
    overallScore: { ...overallScore, minimumValidWeight: 0.9 } });
  assert.deepEqual([payload.technicians[0].kpis.revenue.value, payload.technicians[0].kpis.revenue.hasData], [0, true]);
  assert.deepEqual([payload.technicians[1].kpis.revenue.value, payload.technicians[1].kpis.revenue.hasData], [null, false]);
  assert.equal(payload.slides["top-three"].entries.filter((entry) => entry.placeholder).length, 2);
});
