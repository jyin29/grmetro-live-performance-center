"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const televisions = require("../../../shared/televisions");
const { createApp } = require("../src/app");
const { loadConfig } = require("../src/config");
const { DashboardCache } = require("../src/cache/dashboardCache");
const { TvManager } = require("../src/tv/tvManager");
const businessRules = require("../../../shared/businessRules");

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
    serviceTitanStatusProvider: () => ({ status: "connected", lastSuccessfulRequestAt: "2026-07-31T15:59:00.000Z", csrfToken: "secret" }),
    adminRuntime: options.adminRuntime
  });
  return { app, cache, tvManager, scheduler, advance(milliseconds) { now = new Date(now.getTime() + milliseconds); } };
}

test("admin API exposes safe read-only configuration and runtime state", async () => {
  const displayState = { displayId: "main-office", displayName: "Main Office", activeSlideIndex: 0, isRunning: true,
    presentationProfile: "standard", nextRotationAt: "2026-07-31T16:00:30.000Z" };
  const setup = fixture({ adminRuntime: { startedAt: new Date("2026-07-31T15:00:00.000Z"),
    presentationManager: { getDisplayStates: () => [displayState] },
    connectionStatusProvider: () => ({ total: 3, displays: 1, remotes: 2, byDisplay: { "main-office": { total: 3, displays: 1, remotes: 2 } } }),
    eventEngine: { getState: () => ({ activeEvent: null, queueLength: 2 }) } } });
  setup.cache.storeSuccessfulPayload({ technicians: [], slides: {} });
  await run(setup.app, async (base) => {
    const { response, body } = await json(base, "/api/v1/admin");
    assert.equal(response.status, 200);
    assert.equal(body.displays[0].currentSlide.label, "Revenue");
    // `total` intentionally means physical display clients only, so a phone remote
    // cannot make an offline TV look connected. `socketTotal` preserves raw sockets.
    assert.deepEqual(body.displays[0].connectedClients, { total: 1, socketTotal: 3, displays: 1, remotes: 2 });
    assert.equal(body.businessRules.rules.length, businessRules.rules.length);
    assert.equal(body.events.pendingEvents, 2);
    assert.equal(body.presentation.slides.length, 6);
    assert.equal(body.system.connectedRemotes, 2);
    assert.equal(JSON.stringify(body).toLowerCase().includes("servicetitan"), false);
  });
});

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

// Remaining tests unchanged below.
