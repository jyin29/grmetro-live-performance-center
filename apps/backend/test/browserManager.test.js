"use strict";

const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");
const test = require("node:test");
const { BrowserManager, DEFAULT_RETRY_DELAYS } = require("../src/browser/browserManager");
const { findServiceTitanPage } = require("../src/browser/findServiceTitanPage");
const { createBrowserManagerForConfig } = require("../src/browser/createBrowserManager");

const silentLogger = { debug() {}, info() {}, warn() {}, error() {} };
const flush = () => new Promise((resolve) => setImmediate(resolve));

function page(url, closed = false) { return { url: () => url, isClosed: () => closed }; }
function browser(contextPages) {
  const instance = new EventEmitter();
  instance.connected = true;
  instance.contexts = () => contextPages.map((pages) => ({ pages: () => pages }));
  instance.isConnected = () => instance.connected;
  return instance;
}
function timers() {
  let id = 0;
  const pending = new Map();
  return {
    set(callback, delay) { const timer = { id: ++id, unref() {} }; pending.set(timer, { callback, delay }); return timer; },
    clear(timer) { pending.delete(timer); },
    async runNext() { const [timer, item] = pending.entries().next().value; pending.delete(timer); item.callback(); await flush(); },
    get delays() { return [...pending.values()].map(({ delay }) => delay); },
    get count() { return pending.size; }
  };
}
function manager(options = {}) {
  const fakeTimers = options.timers || timers();
  return { fakeTimers, instance: new BrowserManager({ debugUrl: "http://127.0.0.1:9333", connector: options.connector,
    logger: options.logger || silentLogger, retryDelays: options.retryDelays || DEFAULT_RETRY_DELAYS,
    clock: options.clock || (() => new Date("2026-07-31T12:00:00Z")),
    setTimeoutFn: fakeTimers.set.bind(fakeTimers), clearTimeoutFn: fakeTimers.clear.bind(fakeTimers) }) };
}

test("page discovery scans every context, ignores closed pages, and prefers Technician Scorecard", () => {
  const fallback = page("https://go.servicetitan.com/#/home");
  const scorecard = page("https://go.servicetitan.com/#/new/dashboards/technician-scorecard/1");
  const selected = findServiceTitanPage(browser([[page("https://example.com"), page("https://go.servicetitan.com/#/technician-scorecard", true)], [fallback, scorecard]]));
  assert.equal(selected, scorecard);
  assert.equal(findServiceTitanPage(browser([[fallback]])), fallback);
});

test("page discovery distinguishes missing pages from obvious authentication pages", () => {
  assert.throws(() => findServiceTitanPage(browser([[page("https://example.com")]])), { code: "SERVICE_TITAN_PAGE_NOT_FOUND" });
  assert.throws(() => findServiceTitanPage(browser([[page("https://go.servicetitan.com/login?returnUrl=home")]])),
    { code: "SERVICE_TITAN_AUTH_REQUIRED" });
});

test("configured URL and timeout are used, concurrent calls share one connection, and connection persists", async () => {
  let resolveConnection;
  const edge = browser([[page("https://go.servicetitan.com/#/home")]]);
  const calls = [];
  const setup = manager({ connector: (...args) => { calls.push(args); return new Promise((resolve) => { resolveConnection = resolve; }); } });
  const first = setup.instance.connect();
  const second = setup.instance.connect();
  assert.equal(first, second);
  resolveConnection(edge);
  assert.equal(await first, edge);
  assert.equal(await setup.instance.connect(), edge);
  assert.deepEqual(calls, [["http://127.0.0.1:9333", { timeout: 30000 }]]);
  assert.equal(setup.instance.getBrowser(), edge);
});

test("a closed selected page is rediscovered", async () => {
  let closed = false;
  const first = { url: () => "https://go.servicetitan.com/#/home", isClosed: () => closed };
  const replacement = page("https://go.servicetitan.com/#/new/dashboards/technician-scorecard");
  const edge = browser([[first, replacement]]);
  const setup = manager({ connector: async () => edge });
  await setup.instance.connect();
  assert.equal(setup.instance.getServiceTitanPage(), replacement);
  closed = true;
  assert.equal(setup.instance.getServiceTitanPage(), replacement);
});

test("disconnect clears references, starts one bounded retry loop, and reconnection restores status", async () => {
  const first = browser([[page("https://go.servicetitan.com/#/home")]]);
  const restored = browser([[page("https://go.servicetitan.com/#/technician-scorecard")]]);
  let calls = 0;
  const setup = manager({ connector: async () => (++calls === 1 ? first : restored) });
  await setup.instance.connect();
  first.connected = false;
  first.emit("disconnected"); first.emit("disconnected");
  assert.throws(() => setup.instance.getBrowser(), { code: "BROWSER_NOT_CONNECTED" });
  assert.equal(setup.fakeTimers.count, 1);
  assert.deepEqual(setup.fakeTimers.delays, [1000]);
  await setup.fakeTimers.runNext();
  assert.equal(setup.instance.getBrowser(), restored);
  assert.equal(setup.instance.getStatus().connected, true);
  assert.equal(setup.instance.getStatus().serviceTitanPageFound, true);
  assert.equal(setup.instance.getStatus().reconnectAttempt, 0);
});

test("Edge may start late and retry delays become bounded at thirty seconds", async () => {
  const edge = browser([[page("https://go.servicetitan.com/#/home")]]);
  let failures = 0;
  const setup = manager({ connector: async () => { if (failures++ < 5) throw new Error("sensitive websocket detail"); return edge; } });
  setup.instance.start(); await flush();
  const observed = [];
  for (let index = 0; index < 5; index += 1) { observed.push(setup.fakeTimers.delays[0]); await setup.fakeTimers.runNext(); }
  assert.deepEqual(observed, [1000, 2000, 5000, 10000, 30000]);
  assert.equal(setup.instance.getStatus().connected, true);
});

test("page discovery failure stays recoverable on the same browser connection", async () => {
  const pages = [page("https://example.com")];
  const edge = browser([pages]);
  let connections = 0;
  const setup = manager({ connector: async () => { connections += 1; return edge; } });
  setup.instance.start(); await flush();
  assert.equal(setup.instance.getStatus().lastErrorCode, "SERVICE_TITAN_PAGE_NOT_FOUND");
  pages.push(page("https://go.servicetitan.com/#/home"));
  await setup.fakeTimers.runNext();
  assert.equal(connections, 1);
  assert.equal(setup.instance.getStatus().serviceTitanPageFound, true);
});

test("stop is idempotent, clears timers and listeners, and never closes Edge", async () => {
  const edge = browser([[page("https://go.servicetitan.com/#/home")]]);
  let closes = 0; edge.close = () => { closes += 1; };
  const setup = manager({ connector: async () => edge });
  await setup.instance.connect();
  edge.connected = false; edge.emit("disconnected");
  setup.instance.stop(); setup.instance.stop();
  assert.equal(setup.fakeTimers.count, 0);
  assert.equal(edge.listenerCount("disconnected"), 0);
  assert.equal(closes, 0);
  await assert.rejects(setup.instance.connect(), { code: "BROWSER_MANAGER_STOPPED" });
});

test("mock mode never creates a connector and safe status excludes browser secrets", async () => {
  let connectorFactories = 0;
  const inactive = createBrowserManagerForConfig({ mockMode: true }, silentLogger, () => { connectorFactories += 1; });
  assert.equal(inactive, null);
  assert.equal(connectorFactories, 0);
  const edge = browser([[page("https://go.servicetitan.com/#/home")]]);
  const setup = manager({ connector: async () => edge });
  await setup.instance.connect();
  const serialized = JSON.stringify(setup.instance.getStatus()).toLowerCase();
  for (const secret of ["debug", "websocket", "cookie", "csrf", "token", "credential", "127.0.0.1"])
    assert.equal(serialized.includes(secret), false);
});

test("errors and logs use safe messages without connector internals", async () => {
  const logs = [];
  const setup = manager({ connector: async () => { throw new Error("ws://secret password=x cookie=y"); },
    logger: { ...silentLogger, warn: (message, metadata) => logs.push(JSON.stringify({ message, metadata })) } });
  await assert.rejects(setup.instance.connect(), { code: "BROWSER_CONNECTION_FAILED" });
  const serialized = logs.join(" ").toLowerCase();
  for (const secret of ["ws://secret", "password=x", "cookie=y"]) assert.equal(serialized.includes(secret), false);
});
