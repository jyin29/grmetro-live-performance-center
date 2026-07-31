"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { loadConfig } = require("../src/config");

const valid = {
  NODE_ENV: "development", HOST: "127.0.0.1", PORT: "3000",
  EDGE_DEBUG_URL: "http://127.0.0.1:9222", SERVICETITAN_BASE_URL: "https://go.servicetitan.com",
  TIMEZONE: "America/New_York", REFRESH_INTERVAL_SECONDS: "60", REMOTE_OVERRIDE_SECONDS: "120",
  RETURN_TRANSITION_MILLISECONDS: "1000", STALE_WARNING_SECONDS: "180", STALE_CRITICAL_SECONDS: "600",
  MOCK_MODE: "true", ENABLE_DEVELOPMENT_ROUTES: "true"
};
const load = (overrides = {}) => loadConfig({ ...valid, ...overrides }, { loadEnvironmentFile: false });

test("valid development and production configurations load", () => {
  assert.equal(load().mockMode, true);
  const production = load({ NODE_ENV: "production", MOCK_MODE: "false", ENABLE_DEVELOPMENT_ROUTES: "false" });
  assert.equal(production.isProduction, true);
});

test("invalid ports, hosts, URLs, intervals, and timeouts fail clearly", () => {
  assert.throws(() => load({ PORT: "70000" }), /PORT/);
  assert.throws(() => load({ HOST: "http:\/\/127.0.0.1" }), /HOST/);
  assert.throws(() => load({ EDGE_DEBUG_URL: "http://office-host:9222" }), /EDGE_DEBUG_URL/);
  assert.throws(() => load({ SERVICETITAN_BASE_URL: "http://go.servicetitan.com" }), /SERVICETITAN_BASE_URL/);
  assert.throws(() => load({ REFRESH_INTERVAL_SECONDS: "0" }), /REFRESH_INTERVAL_SECONDS/);
  assert.throws(() => load({ REMOTE_OVERRIDE_SECONDS: "later" }), /REMOTE_OVERRIDE_SECONDS/);
  assert.throws(() => load({ STALE_WARNING_SECONDS: "600", STALE_CRITICAL_SECONDS: "180" }), /STALE_CRITICAL_SECONDS/);
});

test("production rejects mock mode and development routes", () => {
  assert.throws(() => load({ NODE_ENV: "production", MOCK_MODE: "true", ENABLE_DEVELOPMENT_ROUTES: "false" }), /MOCK_MODE/);
  assert.throws(() => load({ NODE_ENV: "production", MOCK_MODE: "false", ENABLE_DEVELOPMENT_ROUTES: "true" }), /Development routes/);
});
