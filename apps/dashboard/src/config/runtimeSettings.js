function numberSetting(value, fallback, minimum = 250) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= minimum ? parsed : fallback;
}

function booleanSetting(value, fallback = false) {
  if (value === undefined) return fallback;
  return String(value).toLowerCase() === "true";
}

export function createRuntimeSettings(env = import.meta.env) {
  return Object.freeze({
    kioskMode: booleanSetting(env.VITE_KIOSK_MODE),
    diagnosticsVisible: booleanSetting(env.VITE_DIAGNOSTICS_VISIBLE),
    watchdogIntervalMs: numberSetting(env.VITE_WATCHDOG_INTERVAL_MS, 15_000),
    presentationStaleMs: numberSetting(env.VITE_PRESENTATION_STALE_MS, 90_000),
    dashboardStaleMs: numberSetting(env.VITE_DASHBOARD_STALE_MS, 150_000),
    reconnectMinimumMs: numberSetting(env.VITE_RECONNECT_MINIMUM_MS, 500),
    reconnectMaximumMs: numberSetting(env.VITE_RECONNECT_MAXIMUM_MS, 10_000),
    cursorIdleMs: numberSetting(env.VITE_CURSOR_IDLE_MS, 3_000),
    buildVersion: env.VITE_BUILD_VERSION || null,
  });
}

export const RUNTIME_SETTINGS = createRuntimeSettings();
