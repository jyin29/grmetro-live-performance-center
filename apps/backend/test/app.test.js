"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { createApp } = require("../src/app");
const { loadConfig } = require("../src/config");

function config(nodeEnv = "test", overrides = {}) {
  return { ...loadConfig({
    NODE_ENV: nodeEnv, MOCK_MODE: "false", ENABLE_DEVELOPMENT_ROUTES: "false",
    REMOTE_RATE_LIMIT_MAX_REQUESTS: "2", REMOTE_RATE_LIMIT_WINDOW_SECONDS: "60"
  }, { loadEnvironmentFile: false }), ...overrides };
}
const logger = Object.freeze({ debug() {}, info() {}, warn() {}, error() {} });

async function run(app, action) {
  const server = await new Promise((resolve) => { const listener = app.listen(0, "127.0.0.1", () => resolve(listener)); });
  try { return await action(`http://127.0.0.1:${server.address().port}`); }
  finally { await new Promise((resolve) => server.close(resolve)); }
}

test("JSON errors use the standard shape and production hides stack traces", async () => {
  for (const nodeEnv of ["test", "production"]) {
    await run(createApp({ config: config(nodeEnv), logger }), async (base) => {
      const response = await fetch(`${base}/missing`);
      assert.deepEqual(await response.json(), { error: { code: "NOT_FOUND", message: "The requested resource was not found." } });
      assert.equal(response.status, 404);
    });
  }
  await run(createApp({ config: config("production"), logger }), async (base) => {
    const response = await fetch(`${base}/api/remote/example`, { method: "POST", headers: { "content-type": "application/json" }, body: "{" });
    const body = await response.json();
    assert.equal(body.error.code, "INVALID_JSON");
    assert.equal(Object.hasOwn(body.error, "stack"), false);
  });
});

test("JSON request-size limits are enforced", async () => {
  await run(createApp({ config: config("test", { jsonBodyLimit: "20b" }), logger }), async (base) => {
    const response = await fetch(`${base}/api/remote/example`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ value: "x".repeat(50) }) });
    assert.equal(response.status, 413);
    assert.equal((await response.json()).error.code, "REQUEST_TOO_LARGE");
  });
});

test("remote route rate limiting is deterministic and other paths are not limited", async () => {
  await run(createApp({ config: config(), logger }), async (base) => {
    const statuses = [];
    for (let index = 0; index < 3; index += 1) statuses.push((await fetch(`${base}/api/remote/example`)).status);
    assert.deepEqual(statuses, [404, 404, 429]);
    assert.equal((await fetch(`${base}/another-path`)).status, 404);
  });
});

test("development CORS is enabled while production remains same-origin", async () => {
  for (const [nodeEnv, expected] of [["test", "https://example.test"], ["production", null]]) {
    await run(createApp({ config: config(nodeEnv), logger }), async (base) => {
      const response = await fetch(`${base}/missing`, { headers: { origin: "https://example.test" } });
      assert.equal(response.headers.get("access-control-allow-origin"), expected);
    });
  }
});
