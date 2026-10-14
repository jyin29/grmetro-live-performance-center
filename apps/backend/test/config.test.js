"use strict";

const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const net = require("node:net");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { loadConfig } = require("../src/config");

const valid = {
  NODE_ENV: "development", HOST: "127.0.0.1", PORT: "3000",
  EDGE_DEBUG_URL: "http://127.0.0.1:9223", SERVICETITAN_BASE_URL: "https://go.servicetitan.com",
  SERVICETITAN_BUSINESS_UNIT_IDS: "101,202,303",
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

test("business unit IDs are configurable, numeric, and de-duplicated", () => {
  assert.deepEqual(load({ SERVICETITAN_BUSINESS_UNIT_IDS: "101, 202,101" }).businessUnitIds, [101, 202]);
  assert.throws(() => load({ SERVICETITAN_BUSINESS_UNIT_IDS: "" }), /SERVICETITAN_BUSINESS_UNIT_IDS/);
  assert.throws(() => load({ SERVICETITAN_BUSINESS_UNIT_IDS: "101,nope" }), /SERVICETITAN_BUSINESS_UNIT_IDS/);
});

test("invalid ports, hosts, URLs, intervals, and timeouts fail clearly", () => {
  assert.throws(() => load({ PORT: "70000" }), /PORT/);
  assert.throws(() => load({ HOST: "http:\/\/127.0.0.1" }), /HOST/);
  assert.throws(() => load({ EDGE_DEBUG_URL: "http://office-host:9222" }), /EDGE_DEBUG_URL/);
  assert.throws(() => load({ EDGE_CONNECTION_TIMEOUT_MILLISECONDS: "999" }), /EDGE_CONNECTION_TIMEOUT_MILLISECONDS/);
  assert.throws(() => load({ SERVICETITAN_BASE_URL: "http://go.servicetitan.com" }), /SERVICETITAN_BASE_URL/);
  assert.throws(() => load({ REFRESH_INTERVAL_SECONDS: "0" }), /REFRESH_INTERVAL_SECONDS/);
  assert.throws(() => load({ REMOTE_OVERRIDE_SECONDS: "later" }), /REMOTE_OVERRIDE_SECONDS/);
  assert.throws(() => load({ STALE_WARNING_SECONDS: "600", STALE_CRITICAL_SECONDS: "180" }), /STALE_CRITICAL_SECONDS/);
});

test("production rejects mock mode and development routes", () => {
  assert.throws(() => load({ NODE_ENV: "production", MOCK_MODE: "true", ENABLE_DEVELOPMENT_ROUTES: "false" }), /MOCK_MODE/);
  assert.throws(() => load({ NODE_ENV: "production", MOCK_MODE: "false", ENABLE_DEVELOPMENT_ROUTES: "true" }), /Development routes/);
});

function availablePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      server.close((error) => error ? reject(error) : resolve(port));
    });
  });
}

test("real backend startup and management API accept the PowerShell 5.1 technician wrapper", { timeout: 30_000 }, async () => {
  const technicians = [
    { id: 200000101, name: "Synthetic Alpha", shortName: "Alpha", initials: "SA" },
    { id: 200000102, name: "Synthetic Beta", shortName: "Beta", initials: "SB" },
  ];
  const port = await availablePort();
  const workingDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "grmetro-legacy-config-"));
  const child = spawn(process.execPath, [path.join(__dirname, "../src/index.js")], {
    cwd: workingDirectory,
    env: {
      ...process.env,
      NODE_ENV: "test", HOST: "127.0.0.1", PORT: String(port), MOCK_MODE: "true", ENABLE_DEVELOPMENT_ROUTES: "false",
      EDGE_DEBUG_URL: "http://127.0.0.1:1", SERVICETITAN_BASE_URL: "https://go.servicetitan.com",
      SERVICETITAN_BUSINESS_UNIT_IDS: "1", SERVICETITAN_TECHNICIANS_JSON: JSON.stringify({ value: technicians, Count: technicians.length }),
      TIMEZONE: "America/New_York", REFRESH_INTERVAL_SECONDS: "60", REMOTE_OVERRIDE_SECONDS: "120",
      RETURN_TRANSITION_MILLISECONDS: "1000", STALE_WARNING_SECONDS: "180", STALE_CRITICAL_SECONDS: "600",
    },
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
  let diagnostics = "";
  child.stdout.on("data", (chunk) => { diagnostics += chunk.toString(); });
  child.stderr.on("data", (chunk) => { diagnostics += chunk.toString(); });
  try {
    const deadline = Date.now() + 20_000;
    let health;
    while (Date.now() < deadline && !health && child.exitCode === null) {
      try {
        const response = await fetch(`http://127.0.0.1:${port}/api/v1/health`);
        if (response.ok) health = await response.json();
      } catch { /* startup */ }
      if (!health) await new Promise((resolve) => setTimeout(resolve, 100));
    }
    assert.equal(child.exitCode, null, diagnostics);
    assert.equal(health?.status, "ok", diagnostics);
    const response = await fetch(`http://127.0.0.1:${port}/api/v1/management/goals`);
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.deepEqual(body.technicians.map(({ id, name, shortName }) => ({ id, name, shortName })), technicians.map(({ id, name, shortName }) => ({ id, name, shortName })));
  } finally {
    if (child.exitCode === null) {
      child.kill();
      await new Promise((resolve) => child.once("exit", resolve));
    }
    fs.rmSync(workingDirectory, { recursive: true, force: true });
  }
});
