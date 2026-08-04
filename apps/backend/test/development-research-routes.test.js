"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createApp } = require("../src/app");
const { loadConfig } = require("../src/config");
const { DashboardCache } = require("../src/cache/dashboardCache");
const { TvManager } = require("../src/tv/tvManager");

const logger = Object.freeze({ debug() {}, info() {}, warn() {}, error() {} });
function config(nodeEnv, enabled) { return { ...loadConfig({ NODE_ENV: nodeEnv, MOCK_MODE: "false", ENABLE_DEVELOPMENT_ROUTES: enabled ? "true" : "false", REMOTE_RATE_LIMIT_MAX_REQUESTS: "20", REMOTE_RATE_LIMIT_WINDOW_SECONDS: "60" }, { loadEnvironmentFile: false }) }; }
function app({ nodeEnv = "test", enabled = true, observer } = {}) {
  return createApp({ config: config(nodeEnv, enabled), logger, cache: new DashboardCache(), tvManager: new TvManager({ setTimeoutFn() { return { unref() {} }; } }), scheduler: { active: false, refresh: async () => ({ ok: true }) }, serviceTitanClient: observer ? { researchObserver: observer } : null, browserStatusProvider: () => ({}), serviceTitanStatusProvider: () => ({}) });
}
async function run(application, action) { const server = await new Promise((resolve) => { const listener = application.listen(0, "127.0.0.1", () => resolve(listener)); }); try { return await action(`http://127.0.0.1:${server.address().port}`); } finally { await new Promise((resolve) => server.close(resolve)); } }
async function json(base, path, options) { const response = await fetch(`${base}${path}`, options); let body = null; try { body = await response.json(); } catch {} return { response, body }; }

test("development research routes start, stop, read, and clear sanitized observer results", async () => {
  const calls = [];
  const observer = { start() { calls.push("start"); return { active: true, attached: true, eventCount: 1 }; }, stop() { calls.push("stop"); return { active: false, eventCount: 1 }; }, results() { calls.push("results"); return { active: false, maxEvents: 100, count: 1, events: [{ endpoint: "/app/api/reporting/x", request: { safeValues: { KpiType: "2" }, bodyFields: ["KpiType"] }, response: { fields: [{ field: "JobId", types: ["number"], presentInRecords: 1 }] } }] }; }, clear() { calls.push("clear"); } };
  await run(app({ observer }), async (base) => {
    assert.equal((await json(base, "/api/v1/dev/servicetitan/research/start", { method: "POST" })).body.research.attached, true);
    assert.equal((await json(base, "/api/v1/dev/servicetitan/research/stop", { method: "POST" })).body.research.active, false);
    const results = await json(base, "/api/v1/dev/servicetitan/research/results");
    assert.equal(results.body.research.count, 1);
    for (const privateText of ["headers", "csrf", "cookie", "raw", "invoice", "customer"]) assert.equal(JSON.stringify(results.body).toLowerCase().includes(privateText), false);
    await json(base, "/api/v1/dev/servicetitan/research/results", { method: "DELETE" });
  });
  assert.deepEqual(calls, ["start", "stop", "results", "clear", "results"]);
});

test("research routes are unavailable unless development routes are enabled outside production", async () => {
  for (const setup of [app({ enabled: false }), app({ nodeEnv: "production", enabled: false })]) {
    await run(setup, async (base) => assert.equal((await fetch(`${base}/api/v1/dev/servicetitan/research/start`, { method: "POST" })).status, 404));
  }
  await run(app({ enabled: true, observer: null }), async (base) => {
    const result = await json(base, "/api/v1/dev/servicetitan/research/start", { method: "POST" });
    assert.equal(result.response.status, 503);
    assert.equal(result.body.error.code, "SERVICETITAN_UNAVAILABLE");
  });
});
