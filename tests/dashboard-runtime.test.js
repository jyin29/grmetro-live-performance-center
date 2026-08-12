const test = require("node:test");
const assert = require("node:assert/strict");

test("watchdog detects frozen clocks, stale state, and reconnect recovery without leaking timers", async () => {
  const { createDisplayWatchdog } = await import("../apps/dashboard/src/runtime/displayWatchdog.js");
  let now = 1_000; let callback; let canceled = 0; const recoveries = [];
  const watchdog = createDisplayWatchdog({ intervalMs: 1_000, presentationStaleMs: 2_000, dashboardStaleMs: 3_000,
    now: () => now, schedule: (fn) => { callback = fn; return 7; }, cancel: (id) => { assert.equal(id, 7); canceled += 1; }, onRecover: (state) => recoveries.push(state) });
  watchdog.update({ connected: true, lastSynchronization: 1_000, lastDashboardRefresh: 1_000 }); watchdog.start();
  now = 5_000; callback();
  assert.deepEqual(recoveries[0], { reason: "watchdog", frozen: true, disconnected: false, presentationStale: true, dashboardStale: true });
  watchdog.stop(); watchdog.stop(); assert.equal(canceled, 1);
});

test("watchdog recovers disconnected displays and backend restart state", async () => {
  const { createDisplayWatchdog } = await import("../apps/dashboard/src/runtime/displayWatchdog.js");
  const recoveries = []; const watchdog = createDisplayWatchdog({ intervalMs: 1_000, presentationStaleMs: 10_000, dashboardStaleMs: 10_000,
    now: () => 2_000, schedule: () => 1, cancel: () => {}, onRecover: (state) => recoveries.push(state) });
  watchdog.update({ connected: false, lastSynchronization: 1_500, lastDashboardRefresh: null }); watchdog.inspect();
  assert.equal(recoveries[0].disconnected, true); assert.equal(recoveries[0].dashboardStale, true);
});

test("diagnostics state tracks uptime, socket, reconnects, backend, and build", async () => {
  const { createDiagnosticsState } = await import("../apps/dashboard/src/runtime/diagnostics.js");
  assert.deepEqual(createDiagnosticsState({ visible: true, displayId: "tv-1", presentationProfile: "standard", startedAt: 1_000, now: 6_000,
    connectionState: "connected", reconnectCount: 3, lastSuccessfulRefresh: 5_000, hasError: false, buildVersion: "abc" }),
  { visible: true, displayId: "tv-1", presentationProfile: "standard", uptimeMs: 5_000, websocketStatus: "connected", reconnectCount: 3, backendConnected: true, buildVersion: "abc" });
});

test("fullscreen helpers support entry, exit, and keyboard behavior", async () => {
  const { isFullscreenShortcut, toggleDisplayFullscreen } = await import("../apps/dashboard/src/runtime/fullscreen.js");
  let entered = 0; let exited = 0; const doc = { fullscreenElement: null, documentElement: { requestFullscreen: async () => { entered += 1; } }, exitFullscreen: async () => { exited += 1; } };
  assert.equal(await toggleDisplayFullscreen(doc), true); assert.equal(entered, 1);
  doc.fullscreenElement = {}; assert.equal(await toggleDisplayFullscreen(doc), false); assert.equal(exited, 1);
  assert.equal(isFullscreenShortcut({ key: "F", shiftKey: true, ctrlKey: false, metaKey: false, altKey: false }), true);
});

test("hidden-tab recovery waits for visibility and cleans up every listener", async () => {
  const { attachWakeRecovery } = await import("../apps/dashboard/src/runtime/wakeRecovery.js");
  const listeners = new Map(); const removed = [];
  const target = { addEventListener: (type, fn) => listeners.set(type, fn), removeEventListener: (type) => removed.push(type) };
  const doc = { ...target, hidden: true }; const events = [];
  const cleanup = attachWakeRecovery({ documentRef: doc, windowRef: target, recover: (reason) => events.push(reason) });
  listeners.get("visibilitychange")(); assert.deepEqual(events, []);
  doc.hidden = false; listeners.get("visibilitychange")(); listeners.get("online")();
  assert.deepEqual(events, ["visibility", "online"]); cleanup(); assert.equal(removed.length, 3);
});
