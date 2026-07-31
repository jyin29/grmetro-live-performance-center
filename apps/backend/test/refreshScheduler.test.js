"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { DashboardCache } = require("../src/cache/dashboardCache");
const { RefreshScheduler } = require("../src/refresh/refreshScheduler");
const { MockRefreshProvider } = require("../src/providers/mockRefreshProvider");
const { loadMockConfig } = require("../src/config/mockMode");

const mockConfig = loadMockConfig({ NODE_ENV: "development", MOCK_MODE: "true", ENABLE_DEVELOPMENT_ROUTES: "true" });
const silentLogger = { debug() {}, info() {}, warn() {}, error() {} };
const flush = () => new Promise((resolve) => setImmediate(resolve));

function fakeIntervals() {
  let callback;
  let delay;
  let cleared = false;
  return {
    set(fn, milliseconds) { callback = fn; delay = milliseconds; return { unref() {} }; },
    clear() { cleared = true; },
    tick() { callback(); },
    get delay() { return delay; },
    get cleared() { return cleared; }
  };
}

function scheduler(options = {}) {
  const timers = options.timers || fakeIntervals();
  const cache = options.cache || new DashboardCache();
  const instance = new RefreshScheduler({
    provider: options.provider, cache, logger: options.logger || silentLogger,
    intervalMilliseconds: options.intervalMilliseconds || 60000,
    timeZone: "America/New_York", clock: options.clock || (() => new Date("2026-07-31T16:00:00Z")),
    setIntervalFn: timers.set.bind(timers), clearIntervalFn: timers.clear.bind(timers)
  });
  return { instance, cache, timers };
}

test("scheduler refreshes immediately and respects the configured interval", async () => {
  let calls = 0;
  const setup = scheduler({ provider: { async refresh() { calls += 1; return { technicians: [], diagnostics: { results: [] } }; } } });
  setup.instance.start();
  await flush();
  assert.equal(calls, 1);
  assert.equal(setup.timers.delay, 60000);
  setup.timers.tick();
  await flush();
  assert.equal(calls, 2);
  setup.instance.stop();
});

test("overlapping scheduled refreshes are skipped and logged", async () => {
  let release;
  const pending = new Promise((resolve) => { release = resolve; });
  const warnings = [];
  const setup = scheduler({
    provider: { async refresh() { await pending; return { diagnostics: { results: [] } }; } },
    logger: { ...silentLogger, warn(message, metadata) { warnings.push({ message, metadata }); } }
  });
  setup.instance.start();
  const skipped = await setup.instance.refresh("scheduled");
  assert.deepEqual(skipped, { ok: false, skipped: true, code: "REFRESH_IN_PROGRESS" });
  assert.equal(warnings[0].metadata.code, "REFRESH_IN_PROGRESS");
  release();
  await flush();
  setup.instance.stop();
});

test("failures preserve cache and do not stop later scheduled refreshes", async () => {
  let calls = 0;
  const cache = new DashboardCache();
  const prior = { marker: "prior" };
  cache.storeSuccessfulPayload(prior, "2026-07-31T15:59:00Z");
  const setup = scheduler({ cache, provider: { async refresh() {
    calls += 1;
    if (calls === 1) throw Object.assign(new Error("secret session cookie"), { authorization: "secret", code: "UNKNOWN" });
    return { marker: "new", diagnostics: { results: [] } };
  } } });
  setup.instance.start();
  await flush();
  assert.equal(cache.getPayload(), prior);
  setup.timers.tick();
  await flush();
  assert.equal(cache.getPayload().marker, "new");
  setup.instance.stop();
});

test("shutdown stops the scheduler timer", () => {
  const setup = scheduler({ provider: { async refresh() { return { diagnostics: { results: [] } }; } } });
  setup.instance.start();
  setup.instance.stop();
  assert.equal(setup.timers.cleared, true);
});

test("each refresh recalculates the America/New_York date across midnight", async () => {
  const dates = [];
  const times = [new Date("2026-08-01T03:59:59Z"), new Date("2026-08-01T03:59:59Z"),
    new Date("2026-08-01T04:00:01Z"), new Date("2026-08-01T04:00:01Z")];
  const setup = scheduler({
    clock: () => times.shift(),
    provider: { async refresh({ date }) { dates.push(date); return { diagnostics: { results: [] } }; } }
  });
  await setup.instance.refresh();
  await setup.instance.refresh();
  assert.deepEqual(dates, ["2026-07-31", "2026-08-01"]);
});

test("partial failure retains only the failed technician and updates successful technicians", async () => {
  const provider = new MockRefreshProvider({ config: mockConfig, scenario: "normal" });
  const setup = scheduler({ provider, clock: (() => {
    const times = ["2026-07-31T16:00:00Z", "2026-07-31T16:00:01Z", "2026-07-31T16:01:00Z", "2026-07-31T16:01:01Z"];
    return () => new Date(times.shift());
  })() });
  await setup.instance.refresh();
  const before = setup.cache.getPayload();
  provider.selectScenario("partial-technician-failure");
  await setup.instance.refresh();
  const after = setup.cache.getPayload();
  const failedId = 3853;
  const failedBefore = before.technicians.find(({ id }) => id === failedId);
  const failedAfter = after.technicians.find(({ id }) => id === failedId);
  assert.deepEqual(failedAfter.kpis, failedBefore.kpis);
  assert.equal(failedAfter.stale, true);
  assert.equal(failedAfter.lastSuccessfulUpdate, failedBefore.lastSuccessfulUpdate);
  for (const technician of after.technicians.filter(({ id }) => id !== failedId)) {
    assert.equal(technician.stale, false);
    assert.equal(technician.lastSuccessfulUpdate, "2026-07-31T16:01:00.000Z");
  }
});

test("refresh diagnostics and logs exclude thrown sensitive details", async () => {
  const entries = [];
  const logger = Object.fromEntries(["debug", "info", "warn", "error"].map((level) => [level,
    (message, metadata) => entries.push(JSON.stringify({ level, message, metadata }))]));
  const setup = scheduler({ logger, provider: { async refresh() { throw new Error("password=bad cookie=session-secret csrf=token"); } } });
  const result = await setup.instance.refresh();
  const serialized = JSON.stringify({ result, entries }).toLowerCase();
  for (const sensitive of ["password=bad", "session-secret", "csrf=token"]) assert.equal(serialized.includes(sensitive), false);
  assert.deepEqual(result.diagnostic, { code: "REFRESH_FAILED", retryable: true });
});
