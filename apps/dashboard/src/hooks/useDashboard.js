import { useCallback, useEffect, useRef, useState } from "react";
import { fetchDashboard } from "../api/dashboardApi";

const POLL_INTERVAL_MS = 5_000;
const RECOVERY_POLL_MS = 2_000;
const STALE_AFTER_MS = 120_000;
export const DASHBOARD_UPDATE_EVENT = "grmetro:dashboard-update";

export function useDashboard() {
  const [state, setState] = useState({ data: null, error: null, loading: true, refreshing: false, lastSuccessfulRefresh: null, stale: false, consecutiveFailures: 0 });
  const controllerRef = useRef(null); const timeoutRef = useRef(null); const failuresRef = useRef(0); const lastGoodRef = useRef(null);

  const load = useCallback(async ({ background = false } = {}) => {
    controllerRef.current?.abort(); const controller = new AbortController(); controllerRef.current = controller;
    setState((current) => ({ ...current, loading: !current.data && !background, refreshing: Boolean(current.data) && !background }));
    try {
      const data = await fetchDashboard({ signal: controller.signal });
      const refreshTime = new Date(data.refreshedAt).getTime(); const goodTime = Number.isFinite(refreshTime) ? refreshTime : Date.now();
      failuresRef.current = 0; lastGoodRef.current = data;
      const stale = Date.now() - goodTime > STALE_AFTER_MS;
      setState({ data, error: null, loading: false, refreshing: false, lastSuccessfulRefresh: goodTime, stale, consecutiveFailures: 0 });
      return true;
    } catch (error) {
      if (error.name !== "AbortError") {
        failuresRef.current += 1;
        setState((current) => ({ ...current, data: current.data || lastGoodRef.current, error, loading: false, refreshing: false, stale: true, consecutiveFailures: failuresRef.current }));
      }
      return false;
    }
  }, []);

  useEffect(() => {
    let active = true;
    const schedule = (delay) => { window.clearTimeout(timeoutRef.current); timeoutRef.current = window.setTimeout(async () => {
      if (!active) return; if (!document.hidden) await load({ background: true });
      const currentAge = state.lastSuccessfulRefresh ? Date.now() - state.lastSuccessfulRefresh : Infinity;
      schedule(failuresRef.current > 0 || currentAge > STALE_AFTER_MS ? RECOVERY_POLL_MS : POLL_INTERVAL_MS);
    }, delay); };
    load().finally(() => schedule(POLL_INTERVAL_MS));
    return () => { active = false; window.clearTimeout(timeoutRef.current); controllerRef.current?.abort(); };
  }, [load, state.lastSuccessfulRefresh]);

  useEffect(() => {
    const recover = () => { if (!document.hidden) load({ background: true }); }; const synchronize = () => load({ background: true });
    document.addEventListener("visibilitychange", recover); window.addEventListener("online", recover); window.addEventListener("pageshow", recover); window.addEventListener(DASHBOARD_UPDATE_EVENT, synchronize);
    return () => { document.removeEventListener("visibilitychange", recover); window.removeEventListener("online", recover); window.removeEventListener("pageshow", recover); window.removeEventListener(DASHBOARD_UPDATE_EVENT, synchronize); };
  }, [load]);

  return { ...state, retry: load };
}
