const STORAGE_KEY = "grmetro:kiosk-recovery";
const CHECK_MS = 5000;
const RELOAD_AFTER_FAILURES = 5;
const RELOAD_WINDOW_MS = 15 * 60 * 1000;
const MAX_RELOADS_PER_WINDOW = 3;

function readState() { try { return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "{}"); } catch { return {}; } }
function writeState(state) { try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {} }
function log(type, detail = {}) {
  const state = readState(); const history = Array.isArray(state.history) ? state.history : [];
  history.push({ at: new Date().toISOString(), type, ...detail });
  writeState({ ...state, history: history.slice(-100) });
  window.dispatchEvent(new CustomEvent("grmetro:recovery-event", { detail: history.at(-1) }));
}
export function getLocalRecoveryHistory() { return (readState().history || []).slice().reverse(); }

export function installKioskRecovery({ enabled = true } = {}) {
  if (!enabled || typeof window === "undefined" || window.location.pathname.replace(/\/+$/, "") === "/remote") return () => {};
  let failures = 0; let stopped = false; let request = null;
  const check = async () => {
    if (stopped) return;
    request?.abort(); request = new AbortController();
    try {
      const response = await fetch("/api/v1/health", { cache: "no-store", signal: request.signal });
      if (!response.ok) throw new Error(`health ${response.status}`);
      if (failures) log("backend-recovered", { failures }); failures = 0;
    } catch (error) {
      if (error.name === "AbortError") return;
      failures += 1; log("backend-health-missed", { failures });
      if (failures >= RELOAD_AFTER_FAILURES) {
        const state = readState(); const now = Date.now(); const reloads = (state.reloads || []).filter((at) => now - at < RELOAD_WINDOW_MS);
        if (reloads.length < MAX_RELOADS_PER_WINDOW) {
          reloads.push(now); writeState({ ...state, reloads }); log("controlled-page-reload", { failures, reloadNumber: reloads.length }); window.location.reload(); return;
        }
        log("reload-loop-protected", { failures }); failures = 0;
      }
    }
  };
  const timer = window.setInterval(check, CHECK_MS); check();
  const onError = (event) => log("browser-runtime-error", { message: String(event?.message || event?.reason || "unknown") });
  window.addEventListener("error", onError); window.addEventListener("unhandledrejection", onError);
  return () => { stopped = true; window.clearInterval(timer); request?.abort(); window.removeEventListener("error", onError); window.removeEventListener("unhandledrejection", onError); };
}
