"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const televisions = require("../../../shared/televisions");
const { createApp } = require("../src/app");
const { loadConfig } = require("../src/config");
const { DashboardCache } = require("../src/cache/dashboardCache");
const { TvManager } = require("../src/tv/tvManager");

const logger = Object.freeze({ debug() {}, info() {}, warn() {}, error() {} });

function configuration(nodeEnv = "test", overrides = {}) {
  return { ...loadConfig({
    NODE_ENV: nodeEnv, MOCK_MODE: "false", ENABLE_DEVELOPMENT_ROUTES: "false",
    REMOTE_RATE_LIMIT_MAX_REQUESTS: "20", REMOTE_RATE_LIMIT_WINDOW_SECONDS: "60"
  }, { loadEnvironmentFile: false }), ...overrides };
}

function fixture(options = {}) {
  let now = new Date("2026-07-31T16:00:00.000Z");
  const clock = () => new Date(now);
  const cache = options.cache || new DashboardCache({ clock });
  const tvManager = new TvManager({ clock, setTimeoutFn() { return { unref() {} }; } });
  const scheduler = options.scheduler || { active: false, async refresh() { return { ok: true, skipped: false }; } };
  const config = configuration(options.nodeEnv, options.config);
  const app = createApp({
    config, logger, cache, tvManager, scheduler, clock, applicationVersion: "1.0.0",
    browserStatusProvider: () => ({ connected: true, serviceTitanPageFound: true, debuggerUrl: "secret" }),
    serviceTitanStatusProvider: () => ({ status: "connected", lastSuccessfulRequestAt: "2026-07-31T15:59:00.000Z", csrfToken: "secret" })
  });
  return { app, cache, tvManager, scheduler, advance(milliseconds) { now = new Date(now.getTime() + milliseconds); } };
}

async function run(app, action) {
  const server = await new Promise((resolve) => { const listener = app.listen(0, "127.0.0.1", () => resolve(listener)); });
  try { return await action(`http://127.0.0.1:${server.address().port}`); }
  finally { await new Promise((resolve) => server.close(resolve)); }
}

async function json(base, path, options) {
  const response = await fetch(`${base}${path}`, options);
  return { response, body: await response.json() };
}

test("health reports safe status and cache metadata only", async () => {
  const setup = fixture();
  setup.cache.storeSuccessfulPayload({ status: { staleTechnicianCount: 2 }, rawServiceTitanResponse: { cookie: "secret" } });
  setup.advance(2500);
  await run(setup.app, async (base) => {
    const { body } = await json(base, "/api/v1/health");
    assert.deepEqual(body, {
      status: "ok", backend: "running", version: "1.0.0",
      browser: { connected: true, serviceTitanPageFound: true },
      serviceTitan: { status: "connected", lastSuccessfulRequestAt: "2026-07-31T15:59:00.000Z" },
      cache: { available: true, ageSeconds: 2, lastSuccessfulRefreshAt: "2026-07-31T16:00:00.000Z", staleTechnicianCount: 2 }
    });
    const serialized = JSON.stringify(body).toLowerCase();
    for (const secret of ["csrf", "cookie", "debugger", "rawservicetitan"]) assert.equal(serialized.includes(secret), false);
  });
});

test("dashboard serves the cached payload with backwards-compatible historical comparison data without refreshing", async () => {
  let refreshes = 0;
  const setup = fixture({ scheduler: { active: false, async refresh() { refreshes += 1; } } });
  const payload = { version: 1, technicians: [], slides: {}, status: { cache: "fresh" } };
  setup.cache.storeSuccessfulPayload(payload);
  await run(setup.app, async (base) => {
    const body = (await json(base, "/api/v1/dashboard")).body;
    assert.deepEqual({ ...body, historicalComparison: undefined }, { ...payload, historicalComparison: undefined });
    assert.equal(body.historicalComparison.available, false);
    assert.equal(body.historicalComparison.reason, "no-history");
  });
  assert.equal(refreshes, 0);
});

test("dashboard returns 503 CACHE_UNAVAILABLE before a successful refresh", async () => {
  await run(fixture().app, async (base) => {
    const { response, body } = await json(base, "/api/v1/dashboard");
    assert.equal(response.status, 503);
    assert.deepEqual(body, { ok: false, error: { code: "CACHE_UNAVAILABLE", message: "Dashboard data is unavailable until the first successful refresh.", details: null } });
  });
});

test("TV reads, overrides, resume, isolation, and countdown use the existing manager", async () => {
  const setup = fixture();
  await run(setup.app, async (base) => {
    const list = (await json(base, "/api/v1/tvs")).body;
    assert.equal(list.tvs.length, televisions.length);
    assert.equal(list.tvs.every((tv) => tv.remainingSeconds === null), true);
    assert.equal((await json(base, "/api/v1/tvs/tv-1")).body.id, "tv-1");

    const commands = [
      ["tv-1", { technicianId: "3841" }, 3841, null],
      ["tv-2", { kpiId: "revenue" }, null, "revenue"],
      ["tv-3", { technicianId: 3853, kpiId: "closingRate" }, 3853, "closingRate"]
    ];
    for (const [tvId, command, technicianId, kpiId] of commands) {
      const result = await json(base, `/api/v1/tvs/${tvId}/override`, {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(command)
      });
      assert.equal(result.body.tv.selectedTechnicianId, technicianId);
      assert.equal(result.body.tv.selectedKpiId, kpiId);
      assert.equal(result.body.tv.remainingSeconds, 120);
    }
    setup.advance(120001);
    const remote = (await json(base, "/api/v1/tvs/tv-1")).body;
    assert.equal(remote.remainingSeconds, 0);
    assert.equal(setup.tvManager.getTelevision("tv-4").mode, "live");
    const resumed = await json(base, "/api/v1/tvs/tv-1/resume", {
      method: "POST", headers: { "content-type": "application/json" }, body: "{}"
    });
    assert.equal(resumed.body.tv.mode, "returning");
  });
});

test("TV routes return stable validation envelopes", async () => {
  await run(fixture().app, async (base) => {
    const cases = [
      ["/api/v1/tvs/unknown", undefined, 404, "INVALID_TV_ID"],
      ["/api/v1/tvs/tv-1/override", {}, 400, "NO_SELECTION"],
      ["/api/v1/tvs/tv-1/override", { technicianId: 999 }, 400, "INVALID_TECHNICIAN_ID"],
      ["/api/v1/tvs/tv-1/override", { kpiId: "unknown" }, 400, "INVALID_KPI_ID"],
      ["/api/v1/tvs/tv-1/override", { kpiId: "revenue", extra: true }, 400, "INVALID_OVERRIDE"]
    ];
    for (const [path, body, status, code] of cases) {
      const result = await json(base, path, body === undefined ? undefined : {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body)
      });
      assert.equal(result.response.status, status);
      assert.equal(result.body.ok, false);
      assert.equal(result.body.error.code, code);
      assert.equal(Object.hasOwn(result.body.error, "details"), true);
    }
  });
});

test("malformed and oversized JSON use safe standard errors", async () => {
  const setup = fixture({ nodeEnv: "production", config: { jsonBodyLimit: "20b" } });
  await run(setup.app, async (base) => {
    let result = await json(base, "/api/v1/tvs/tv-1/override", { method: "POST", headers: { "content-type": "application/json" }, body: "{" });
    assert.equal(result.body.error.code, "INVALID_JSON");
    assert.equal(Object.hasOwn(result.body.error, "stack"), false);
    result = await json(base, "/api/v1/tvs/tv-1/override", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ kpiId: "x".repeat(50) }) });
    assert.equal(result.response.status, 413);
    assert.equal(result.body.error.code, "INVALID_OVERRIDE");
  });
});

test("TV mutation rate limiting is deterministic", async () => {
  const setup = fixture({ config: { remoteRateLimit: { windowSeconds: 60, maxRequests: 2 } } });
  await run(setup.app, async (base) => {
    const statuses = [];
    for (let index = 0; index < 3; index += 1) statuses.push((await fetch(`${base}/api/v1/tvs/tv-1/resume`, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" })).status);
    assert.deepEqual(statuses, [200, 200, 429]);
    assert.equal((await fetch(`${base}/api/v1/tvs`)).status, 200);
  });
});

test("development refresh is registered only when explicitly enabled outside production", async () => {
  let calls = 0;
  const scheduler = { active: false, async refresh() { calls += 1; return { ok: true, skipped: false }; } };
  const enabled = fixture({ scheduler, config: { developmentRoutesEnabled: true } });
  await run(enabled.app, async (base) => assert.equal((await json(base, "/api/v1/dev/refresh", { method: "POST" })).response.status, 200));
  assert.equal(calls, 1);

  scheduler.active = true;
  await run(enabled.app, async (base) => {
    const result = await json(base, "/api/v1/dev/refresh", { method: "POST" });
    assert.equal(result.response.status, 409);
    assert.equal(result.body.error.code, "REFRESH_IN_PROGRESS");
  });

  const production = fixture({ nodeEnv: "production", scheduler, config: { developmentRoutesEnabled: true } });
  await run(production.app, async (base) => assert.equal((await fetch(`${base}/api/v1/dev/refresh`, { method: "POST" })).status, 404));
});

test("production internal errors hide stacks and unknown routes use the error contract", async () => {
  const cache = { getPayload() { throw new Error("cookie=secret raw ServiceTitan object"); }, getState() { throw new Error("unused"); } };
  const setup = fixture({ nodeEnv: "production", cache });
  await run(setup.app, async (base) => {
    const internal = await json(base, "/api/v1/dashboard");
    assert.deepEqual(internal.body, { ok: false, error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred.", details: null } });
    assert.equal(JSON.stringify(internal.body).includes("secret"), false);
    const missing = await json(base, "/missing");
    assert.deepEqual(missing.body, { ok: false, error: { code: "NOT_FOUND", message: "The requested resource was not found.", details: null } });
  });
});

test("development drilldown route validates input, gates production, and returns sanitized records", async () => {
  let called = null;
  const serviceTitanClient = { async fetchTechnicianJobDrilldown(args) { called = args; return { ...args, records: [{ jobTypeId: 1, jobTypeName: "Service", revenue: 10 }], removedFields: ["CustomerName"], recordCount: 1 }; } };
  const setup = fixture({ config: { developmentRoutesEnabled: true }, serviceTitanClient });
  setup.app._router = setup.app._router;
  await run(createApp({
    config: configuration("test", { developmentRoutesEnabled: true }), logger, cache: setup.cache, tvManager: setup.tvManager, scheduler: setup.scheduler, clock: () => new Date(), serviceTitanClient
  }), async (base) => {
    const ok = await json(base, "/api/v1/dev/servicetitan/drilldown", { method:"POST", headers:{"content-type":"application/json"}, body: JSON.stringify({ technicianId:134926818, date:"2026-08-04" }) });
    assert.equal(ok.response.status, 200); assert.deepEqual(called, { technicianId:134926818, date:"2026-08-04" }); assert.equal(ok.body.drilldown.removedFields[0], "CustomerName");
    assert.equal((await json(base, "/api/v1/dev/servicetitan/drilldown", { method:"POST", headers:{"content-type":"application/json"}, body: JSON.stringify({ technicianId:999, date:"2026-08-04" }) })).response.status, 400);
    assert.equal((await json(base, "/api/v1/dev/servicetitan/drilldown", { method:"POST", headers:{"content-type":"application/json"}, body: JSON.stringify({ technicianId:134926818, date:"08/04/2026" }) })).response.status, 400);
    for (const date of ["2026-02-31", "2026-13-01", "2026-00-00", "2025-02-29"]) assert.equal((await json(base, "/api/v1/dev/servicetitan/drilldown", { method:"POST", headers:{"content-type":"application/json"}, body: JSON.stringify({ technicianId:134926818, date }) })).response.status, 400);
    assert.equal((await json(base, "/api/v1/dev/servicetitan/drilldown", { method:"POST", headers:{"content-type":"application/json"}, body: JSON.stringify({ technicianId:134926818, date:"2024-02-29" }) })).response.status, 200);
  });
  const prod = fixture({ nodeEnv: "production", config: { developmentRoutesEnabled: true } });
  await run(prod.app, async (base) => assert.equal((await fetch(`${base}/api/v1/dev/servicetitan/drilldown`, { method: "POST", headers:{"content-type":"application/json"}, body:"{}" })).status, 404));
});
