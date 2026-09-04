const STORAGE_KEY = "grmetro:kiosk-recovery";
const CHECK_MS = 5000;
const RUNTIME_ERRORS_BEFORE_RELOAD = 3;
const RELOAD_WINDOW_MS = 15 * 60 * 1000;
const MAX_RELOADS_PER_WINDOW = 3;

function readState() {
  try { return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "{}"); }
  catch { return {}; }
}

function writeState(state) {
  try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  catch {}
}

function log(type, detail = {}) {
  const state = readState();
  const history = Array.isArray(state.history) ? state.history : [];
  history.push({ at: new Date().toISOString(), type, ...detail });
  writeState({ ...state, history: history.slice(-100) });
  window.dispatchEvent(new CustomEvent("grmetro:recovery-event", { detail: history.at(-1) }));
}

export function getLocalRecoveryHistory() {
  return (readState().history || []).slice().reverse();
}

export function shouldControlledReload({ backendHealthy, runtimeErrors }) {
  return backendHealthy === true && runtimeErrors >= RUNTIME_ERRORS_BEFORE_RELOAD;
}

function attemptControlledReload(runtimeErrors) {
  const state = readState();
  const now = Date.now();
  const reloads = (state.reloads || []).filter((at) => now - at < RELOAD_WINDOW_MS);
  if (reloads.length >= MAX_RELOADS_PER_WINDOW) {
    log("reload-loop-protected", { runtimeErrors });
    return false;
  }
  reloads.push(now);
  writeState({ ...state, reloads });
  log("controlled-page-reload", { runtimeErrors, reloadNumber: reloads.length, reason: "runtime-errors-with-healthy-backend" });
  window.location.reload();
  return true;
}

export function installKioskRecovery({ enabled = true } = {}) {
  if (!enabled || typeof window === "undefined" || window.location.pathname.replace(/\/+$/, "") === "/remote") return () => {};

  let backendFailures = 0;
  let runtimeErrors = 0;
  let backendHealthy = false;
  let stopped = false;
  let request = null;

  const check = async () => {
    if (stopped) return;
    request?.abort();
    request = new AbortController();
    try {
      const response = await fetch("/api/v1/health", { cache: "no-store", signal: request.signal });
      if (!response.ok) throw new Error(`health ${response.status}`);
      backendHealthy = true;
      if (backendFailures) {
        log("backend-recovered", { failures: backendFailures });
        backendFailures = 0;
      }
      if (shouldControlledReload({ backendHealthy, runtimeErrors })) {
        if (attemptControlledReload(runtimeErrors)) return;
        runtimeErrors = 0;
      }
    } catch (error) {
      if (error.name === "AbortError") return;
      backendHealthy = false;
      backendFailures += 1;
      log("backend-health-missed", { failures: backendFailures, action: "preserve-last-known-good" });
      // Never reload while the backend/network is unavailable. Reloading here would
      // throw away the already-rendered last-known-good dashboard and expose the TV
      // browser's connection error page. The normal transport layer keeps retrying.
    }
  };

  const onError = (event) => {
    runtimeErrors += 1;
    log("browser-runtime-error", { message: String(event?.message || event?.reason || "unknown"), runtimeErrors });
    // A reload is only permitted after a subsequent successful health check proves
    // that the backend is reachable. This prevents outage-driven reload loops.
  };

  const timer = window.setInterval(check, CHECK_MS);
  check();
  window.addEventListener("error", onError);
  window.addEventListener("unhandledrejection", onError);

  return () => {
    stopped = true;
    window.clearInterval(timer);
    request?.abort();
    window.removeEventListener("error", onError);
    window.removeEventListener("unhandledrejection", onError);
  };
}
