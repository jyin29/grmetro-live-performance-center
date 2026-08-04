"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const technicians = require("../shared/technicians");
const kpis = require("../shared/kpis");
const slides = require("../shared/slides");
const { loadMockConfig } = require("../apps/backend/src/config/mockMode");
const { createRefreshProvider } = require("../apps/backend/src/providers/createRefreshProvider");
const { MockRefreshProvider, MOCK_SCENARIO_NAMES, FIXED_TIME } = require("../apps/backend/src/providers/mockRefreshProvider");

const enabledConfig = loadMockConfig({
  NODE_ENV: "development", MOCK_MODE: "true", ENABLE_DEVELOPMENT_ROUTES: "true"
});

test("mock mode must be enabled explicitly and never silently replaces the live provider", () => {
  assert.equal(loadMockConfig({}).mockMode, false);
  assert.equal(loadMockConfig({ MOCK_MODE: "false" }).mockMode, false);
  assert.equal(loadMockConfig({ MOCK_MODE: "true" }).mockMode, true);
  assert.throws(() => loadMockConfig({ MOCK_MODE: "TRUE" }), /exactly/);
  assert.throws(() => createRefreshProvider({ config: loadMockConfig({}) }), /requires the Edge browser manager/);
  assert.throws(() => new MockRefreshProvider({ config: loadMockConfig({}) }), /explicit/);
});

test("production configuration rejects mock mode and development scenario controls", () => {
  assert.throws(() => loadMockConfig({ NODE_ENV: "production", MOCK_MODE: "true" }), /cannot be enabled/);
  assert.throws(() => loadMockConfig({ NODE_ENV: "production", ENABLE_DEVELOPMENT_ROUTES: "true" }), /Development routes/);
  const provider = new MockRefreshProvider({ config: loadMockConfig({ MOCK_MODE: "true" }) });
  assert.throws(() => provider.selectScenario("stale-data"), /development-only/);
});

test("every scenario produces exactly the configured technicians, KPI records, and five presentation slides", async () => {
  for (const scenario of MOCK_SCENARIO_NAMES) {
    const payload = await new MockRefreshProvider({ config: enabledConfig, scenario }).refresh();
    assert.deepEqual(payload.technicians.map(({ id }) => id), technicians.map(({ id }) => id), scenario);
    assert.equal(payload.technicians.every((technician) => Object.keys(technician.kpis).length === Object.keys(kpis).length), true, scenario);
    assert.deepEqual(Object.keys(payload.slides), slides.map(({ id }) => id), scenario);
    assert.equal(payload.overallTopThree.length, 3, scenario);
  }
});

test("mock results are deterministic and scenario switching is explicitly development-only", async () => {
  const provider = createRefreshProvider({ config: enabledConfig, scenario: "normal" });
  assert.deepEqual(await provider.refresh({ now: FIXED_TIME }), await provider.refresh({ now: FIXED_TIME }));
  provider.selectScenario("ranking-changes");
  const first = await provider.refresh({ now: FIXED_TIME });
  const second = await provider.refresh({ now: FIXED_TIME });
  assert.deepEqual(first, second);
  assert.equal(first.scenario, "ranking-changes");
  assert.equal(first.technicians.some(({ kpis: metrics }) => metrics.revenue.rankChange !== 0), true);
  assert.equal(first.technicians.some(({ overall }) => overall.rankChange !== 0), true);
});

test("zero, missing-data, and no-install scenarios preserve distinct metric semantics", async () => {
  const zero = await new MockRefreshProvider({ config: enabledConfig, scenario: "zero-values" }).refresh();
  assert.equal(zero.technicians[0].kpis.closingRate.value, 0);
  assert.equal(zero.technicians[0].kpis.closingRate.hasData, true);

  const missing = await new MockRefreshProvider({ config: enabledConfig, scenario: "missing-data" }).refresh();
  assert.equal(missing.technicians[1].kpis.leadConversionRate.value, null);
  assert.equal(missing.technicians[1].kpis.leadConversionRate.hasData, false);
  assert.equal(missing.technicians[1].kpis.leadConversionRate.dataQuality, "unavailable");

  const noInstalls = await new MockRefreshProvider({ config: enabledConfig, scenario: "no-installs" }).refresh();
  for (const technician of noInstalls.technicians) {
    assert.deepEqual([technician.kpis.installs.value, technician.kpis.installs.hasData], [0, true]);
    assert.deepEqual([technician.kpis.installRevenue.value, technician.kpis.installRevenue.hasData], [0, true]);
    assert.deepEqual([technician.kpis.installAverageTicket.value, technician.kpis.installAverageTicket.hasData], [null, false]);
  }
});

test("fixture source is sanitized and contains no authentication or personal contact fields", () => {
  const fixturePath = path.join(__dirname, "../apps/backend/test/fixtures/scenarios.json");
  const fixtureText = fs.readFileSync(fixturePath, "utf8");
  const forbidden = ["phone", "email", "customer", "cookie", "csrf", "token", "session", "password", "address"];
  for (const term of forbidden) assert.equal(fixtureText.toLowerCase().includes(term), false, term);
  assert.equal(/https?:\/\//i.test(fixtureText), false);
  assert.equal(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/i.test(fixtureText), false);
});

test("partial failure and stale scenarios retain five presentation records with explicit diagnostics", async () => {
  const partial = await new MockRefreshProvider({ config: enabledConfig, scenario: "partial-technician-failure" }).refresh();
  assert.equal(partial.technicians.length, 5);
  assert.equal(partial.diagnostics.results.filter(({ ok }) => !ok).length, 1);
  assert.equal(partial.status.staleTechnicianCount, 1);
  const stale = await new MockRefreshProvider({ config: enabledConfig, scenario: "stale-data" }).refresh();
  assert.equal(stale.status.cache, "stale");
  assert.equal(stale.status.staleTechnicianCount, 1);
});
