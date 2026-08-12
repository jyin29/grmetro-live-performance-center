export function createDisplayWatchdog({
  intervalMs, presentationStaleMs, dashboardStaleMs, now = Date.now,
  schedule = setInterval, cancel = clearInterval, onRecover,
}) {
  let timer = null;
  let lastTick = now();
  let state = { connected: false, lastSynchronization: null, lastDashboardRefresh: null };

  function inspect(reason = "watchdog") {
    const current = now();
    const frozen = current - lastTick > intervalMs * 2.5;
    const presentationStale = !state.lastSynchronization || current - state.lastSynchronization > presentationStaleMs;
    const dashboardStale = !state.lastDashboardRefresh || current - state.lastDashboardRefresh > dashboardStaleMs;
    lastTick = current;
    if (frozen || !state.connected || presentationStale || dashboardStale) {
      onRecover?.({ reason, frozen, disconnected: !state.connected, presentationStale, dashboardStale });
    }
  }

  return Object.freeze({
    start() { if (!timer) { lastTick = now(); timer = schedule(inspect, intervalMs); } },
    stop() { if (timer) cancel(timer); timer = null; },
    update(next) { state = { ...state, ...next }; },
    inspect,
    wake(reason = "visibility") { lastTick = now(); inspect(reason); },
  });
}
