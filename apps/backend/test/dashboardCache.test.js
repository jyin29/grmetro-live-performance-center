"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { DashboardCache } = require("../src/cache/dashboardCache");

test("the first successful refresh populates the cache and cache age is calculated", () => {
  const cache = new DashboardCache();
  assert.deepEqual(cache.getState(new Date("2026-07-31T12:00:00Z")), {
    available: false, status: "unavailable",
    error: { code: "CACHE_UNAVAILABLE", message: "Dashboard data is unavailable until the first successful refresh." },
    payload: null, refreshStartedAt: null, refreshCompletedAt: null,
    lastSuccessfulRefreshAt: null, cacheAgeMilliseconds: null, lastFailure: null
  });
  const payload = { technicians: [] };
  cache.markRefreshStarted("2026-07-31T12:00:00Z");
  cache.storeSuccessfulPayload(payload, "2026-07-31T12:00:02Z");
  const state = cache.getState("2026-07-31T12:01:02Z");
  assert.deepEqual(state.payload.technicians, payload.technicians);
  assert.equal(state.payload.historicalComparison.reason, "no-history");
  assert.equal(state.lastSuccessfulRefreshAt, "2026-07-31T12:00:02.000Z");
  assert.equal(state.cacheAgeMilliseconds, 60000);
});

test("a total failure preserves the previous successful presentation payload", () => {
  const cache = new DashboardCache();
  const payload = { version: 1 };
  cache.storeSuccessfulPayload(payload, "2026-07-31T12:00:00Z");
  cache.markRefreshStarted("2026-07-31T12:01:00Z");
  cache.markRefreshFailed({ code: "REFRESH_FAILED", retryable: true }, "2026-07-31T12:01:01Z");
  const state = cache.getState("2026-07-31T12:02:00Z");
  assert.equal(state.payload.version, payload.version);
  assert.equal(state.payload.historicalComparison.currentSnapshotId, "snapshot-00000001");
  assert.equal(state.lastSuccessfulRefreshAt, "2026-07-31T12:00:00.000Z");
  assert.equal(state.refreshCompletedAt, "2026-07-31T12:01:01.000Z");
  assert.equal(state.cacheAgeMilliseconds, 120000);
});
