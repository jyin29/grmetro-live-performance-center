"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { createDashboardSnapshot } = require("../src/history/dashboardSnapshot");
const { InMemorySnapshotStore } = require("../src/history/snapshotStore");
const { compareDashboardSnapshots, compareNumber } = require("../src/history/comparisonEngine");
const { analyzeDashboardTrends } = require("../src/history/trendEngine");
const { DashboardCache } = require("../src/cache/dashboardCache");

function technician({ id = 1, value = 100, rank = 2, percentComplete = 50, overallRank = 2,
  hasData = true, dataQuality = "confirmed", stale = false } = {}) {
  return { id, name: `Tech ${id}`, stale, overall: { rank: overallRank }, kpis: { revenue: {
    id: "revenue", value: hasData ? value : null, hasData, dataQuality, rank: hasData ? rank : null,
    percentComplete: hasData ? percentComplete : null
  } } };
}

function payload(technicians, generatedAt = "2026-08-12T12:00:00.000Z") {
  return { version: 1, generatedAt, refreshedAt: generatedAt, technicians, slides: {} };
}

test("snapshot creation clones and deeply freezes an immutable dashboard value", () => {
  const source = payload([technician()]);
  const snapshot = createDashboardSnapshot(source, { id: "snapshot-test", capturedAt: "2026-08-12T12:00:01Z" });
  source.technicians[0].kpis.revenue.value = 999;
  assert.equal(snapshot.dashboard.technicians[0].kpis.revenue.value, 100);
  assert.equal(snapshot.capturedAt, "2026-08-12T12:00:01.000Z");
  assert.equal(snapshot.schemaVersion, 1);
  assert.equal(Object.isFrozen(snapshot.dashboard.technicians[0].kpis), true);
  assert.throws(() => { snapshot.dashboard.version = 2; }, TypeError);
});

test("snapshot store enforces bounded rolling retention in chronological insertion order", () => {
  const store = new InMemorySnapshotStore({ retentionLimit: 2 });
  const first = store.append(payload([]), "2026-08-12T12:00:00Z");
  const second = store.append(payload([]), "2026-08-12T12:01:00Z");
  const third = store.append(payload([]), "2026-08-12T12:02:00Z");
  assert.equal(store.size(), 2);
  assert.deepEqual(store.list().map(({ id }) => id), [second.id, third.id]);
  assert.equal(store.list().includes(first), false);
  assert.throws(() => new InMemorySnapshotStore({ retentionLimit: 0 }), TypeError);
});

test("comparison reports KPI, ranking, overall movement, and goal-progress deltas", () => {
  const store = new InMemorySnapshotStore();
  const previous = store.append(payload([technician()]), "2026-08-12T12:00:00Z");
  const current = store.append(payload([technician({ value: 125, rank: 1, percentComplete: 62.5, overallRank: 1 })]), "2026-08-12T12:01:00Z");
  const comparison = compareDashboardSnapshots(previous, current);
  const movement = comparison.technicians["1"];
  assert.deepEqual(movement.kpis.revenue.value, { available: true, reason: null, delta: 25, direction: "up", previous: 100, current: 125 });
  assert.equal(movement.kpis.revenue.ranking.delta, 1);
  assert.equal(movement.kpis.revenue.ranking.direction, "up");
  assert.equal(movement.overallRanking.delta, 1);
  assert.equal(movement.kpis.revenue.goalProgress.delta, 12.5);
});

test("comparison gracefully represents first snapshot, missing data, new technicians, and stale partial refreshes", () => {
  const store = new InMemorySnapshotStore();
  const first = store.append(payload([technician(), technician({ id: 2, hasData: false, dataQuality: "unavailable" }), technician({ id: 4 })]), "2026-08-12T12:00:00Z");
  assert.deepEqual(compareDashboardSnapshots(null, first), {
    available: false, reason: "no-history", baselineSnapshotId: null, currentSnapshotId: first.id,
    baselineCapturedAt: null, currentCapturedAt: first.capturedAt, technicians: {}
  });
  const second = store.append(payload([
    technician({ hasData: false, dataQuality: "unavailable" }),
    technician({ id: 2, value: 0, rank: 1, percentComplete: 0 }),
    technician({ id: 3 }),
    technician({ id: 4, stale: true })
  ]), "2026-08-12T12:01:00Z");
  const result = compareDashboardSnapshots(first, second);
  assert.equal(result.technicians["1"].kpis.revenue.value.reason, "missing-or-unavailable-kpi");
  assert.equal(result.technicians["2"].kpis.revenue.value.reason, "missing-or-unavailable-kpi");
  assert.equal(result.technicians["3"].reason, "technician-not-in-baseline");
  assert.equal(result.technicians["4"].reason, "stale-technician");
  assert.deepEqual(compareNumber(0, 0), { available: true, reason: null, delta: 0, direction: "unchanged", previous: 0, current: 0 });
});

test("cache adds comparisons without snapshots for failed refresh attempts", () => {
  const cache = new DashboardCache({ snapshotRetentionLimit: 3 });
  cache.storeSuccessfulPayload(payload([technician()]), "2026-08-12T12:00:00Z");
  assert.equal(cache.getPayload().historicalComparison.reason, "no-history");
  cache.storeSuccessfulPayload(payload([technician({ value: 110 })]), "2026-08-12T12:01:00Z");
  assert.equal(cache.getPayload().historicalComparison.technicians["1"].kpis.revenue.value.delta, 10);
  cache.markRefreshFailed({ code: "REFRESH_FAILED" }, "2026-08-12T12:02:00Z");
  assert.equal(cache.snapshotStore.size(), 2);
  assert.equal(cache.getPayload().historicalComparison.currentSnapshotId, "snapshot-00000002");
});

function trendSnapshots(rows) {
  const store = new InMemorySnapshotStore();
  rows.forEach((technicians, index) => store.append(payload(technicians),
    `2026-08-12T12:${String(index).padStart(2, "0")}:00Z`));
  return store.list();
}

test("trend engine identifies consistent KPI increases, decreases, stable values, and ranking improvement", () => {
  const increasing = analyzeDashboardTrends(trendSnapshots([100, 110, 120, 130].map((value, index) =>
    [technician({ value, rank: 4 - index, percentComplete: value / 2, overallRank: 4 - index })])));
  const revenue = increasing.technicians["1"].kpis.revenue;
  assert.equal(revenue.value.trend, "increasing");
  assert.equal(revenue.value.consecutiveIncreases, 3);
  assert.equal(revenue.goalProgress.trend, "improving");
  assert.equal(revenue.ranking.trend, "improving");
  assert.equal(increasing.technicians["1"].overallRanking.trend, "improving");

  const decreasing = analyzeDashboardTrends(trendSnapshots([130, 120, 110, 100].map((value) =>
    [technician({ value })])));
  assert.equal(decreasing.technicians["1"].kpis.revenue.value.trend, "decreasing");
  assert.equal(decreasing.technicians["1"].kpis.revenue.value.consecutiveDecreases, 3);

  const stable = analyzeDashboardTrends(trendSnapshots([100, 100, 100, 100].map((value) =>
    [technician({ value })])));
  assert.equal(stable.technicians["1"].kpis.revenue.value.trend, "stable");
  assert.equal(stable.technicians["1"].kpis.revenue.value.momentum, "stable");
});

test("trend engine requires configurable history and avoids noisy one-refresh reactions", () => {
  const short = analyzeDashboardTrends(trendSnapshots([[technician()], [technician({ value: 110 })]]));
  assert.equal(short.available, false);
  assert.equal(short.reason, "insufficient-history");
  assert.equal(short.technicians["1"].kpis.revenue.value.trend, "unknown");

  const noisy = analyzeDashboardTrends(trendSnapshots([100, 104, 99, 103, 100].map((value) =>
    [technician({ value })])));
  assert.equal(noisy.technicians["1"].kpis.revenue.value.trend, "stable");
  assert.equal(noisy.technicians["1"].kpis.revenue.value.momentum, "mixed");
  assert.throws(() => analyzeDashboardTrends([], { minimumHistory: 2 }), TypeError);
  assert.throws(() => analyzeDashboardTrends([], { minimumConsistency: 0.5 }), TypeError);
});

test("trend engine handles unavailable values, partial refreshes, additions, removals, and empty history", () => {
  const unavailable = analyzeDashboardTrends(trendSnapshots([
    [technician()], [technician({ value: 110 })],
    [technician({ hasData: false, dataQuality: "unavailable" })], [technician({ value: 130 })]
  ]));
  assert.equal(unavailable.technicians["1"].kpis.revenue.value.trend, "unknown");
  assert.equal(unavailable.technicians["1"].kpis.revenue.value.reason, "incomplete-history");

  const partial = analyzeDashboardTrends(trendSnapshots([
    [technician()], [technician({ value: 110 })], [technician({ value: 120, stale: true })], [technician({ value: 130 })]
  ]));
  assert.equal(partial.technicians["1"].kpis.revenue.value.reason, "incomplete-history");

  const changingRoster = analyzeDashboardTrends(trendSnapshots([
    [technician({ id: 1 })], [technician({ id: 1 }), technician({ id: 2 })],
    [technician({ id: 2, value: 110 })], [technician({ id: 2, value: 120 })]
  ]));
  assert.deepEqual(changingRoster.removedTechnicianIds, ["1"]);
  assert.equal(changingRoster.technicians["2"].available, false);
  assert.equal(changingRoster.technicians["2"].reason, "insufficient-technician-history");

  const empty = analyzeDashboardTrends([]);
  assert.equal(empty.reason, "no-history");
  assert.equal(empty.currentSnapshotId, null);
});

test("dashboard cache exposes trends without recursively storing derived history", () => {
  const cache = new DashboardCache({ trendMinimumHistory: 3 });
  [100, 110, 120].forEach((value, index) => cache.storeSuccessfulPayload(payload([technician({ value })]),
    `2026-08-12T12:0${index}:00Z`));
  assert.equal(cache.getPayload().historicalTrends.technicians["1"].kpis.revenue.value.trend, "increasing");
  assert.equal(cache.snapshotStore.latest().dashboard.historicalTrends, undefined);
});
