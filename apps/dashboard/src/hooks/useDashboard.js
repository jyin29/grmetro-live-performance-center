import { useCallback, useEffect, useRef, useState } from "react";
import { fetchDashboard } from "../api/dashboardApi";

const POLL_INTERVAL_MS = 15_000;
const RECOVERY_POLL_MS = 2_000;
const STALE_AFTER_MS = 120_000;
export const DASHBOARD_UPDATE_EVENT = "grmetro:dashboard-update";

function dashboardVersion(data) {
  if (!data || typeof data !== "object") return null;
  return data.refreshedAt || data.generatedAt || null;
}

export function useDashboard() {
  const [state, setState] = useState({ data: null, error: null, loading: true, refreshing: false, lastSuccessfulRefresh: null, stale: false, consecutiveFailures: 0 });
  const controllerRef = useRef(null); const timeoutRef = useRef(null); const failuresRef = useRef(0); const lastGoodRef = useRef(null); const versionRef = useRef(null); const lastSuccessfulRefreshRef = useRef(null);

  const load = useCallback(async ({ background = false } = {}) => {
    controllerRef.current?.abort(); const controller = new AbortController(); controllerRef.current = controller;
    setState((current) => {
      const nextLoading = !current.data && !background;
      const nextRefreshing = Boolean(current.data) && !background;
      if (current.loading === nextLoading && current.refreshing === nextRefreshing) return current;
      return { ...current, loading: nextLoading, refreshing: nextRefreshing };
    });
    try {
      const data = await fetchDashboard({ signal: controller.signal });
      const refreshTime = new Date(data.refreshedAt).getTime(); const goodTime = Number.isFinite(refreshTime) ? refreshTime : Date.now();
      const stale = Date.now() - goodTime > STALE_AFTER_MS;
      const version = dashboardVersion(data);
      failuresRef.current = 0;
      lastSuccessfulRefreshRef.current = goodTime;

      // The backend serves the same cached dashboard between real refreshes. Keep
      // the existing object when its version has not changed so React does not
      // rebuild a large TV slide tree every fallback poll.
      if (lastGoodRef.current && version && versionRef.current === version) {
        setState((current) => {
          if (!current.error && current.loading === false && current.refreshing === false && current.lastSuccessfulRefresh === goodTime && current.stale === stale && current.consecutiveFailures === 0) return current;
          return { ...current, data: lastGoodRef.current, error: null, loading: false, refreshing: false, lastSuccessfulRefresh: goodTime, stale, consecutiveFailures: 0 };
        });
        return true;
      }

      versionRef.current = version;
      lastGoodRef.current = data;
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
      const lastGood = lastSuccessfulRefreshRef.current;
      const currentAge = lastGood ? Date.now() - lastGood : Infinity;
      schedule(failuresRef.current > 0 || currentAge > STALE_AFTER_MS ? RECOVERY_POLL_MS : POLL_INTERVAL_MS);
    }, delay); };
    load().finally(() => schedule(POLL_INTERVAL_MS));
    return () => { active = false; window.clearTimeout(timeoutRef.current); controllerRef.current?.abort(); };
  }, [load]);

  useEffect(() => {
    const recover = () => { if (!document.hidden) load({ background: true }); }; const synchronize = () => load({ background: true });
    document.addEventListener("visibilitychange", recover); window.addEventListener("online", recover); window.addEventListener("pageshow", recover); window.addEventListener(DASHBOARD_UPDATE_EVENT, synchronize);
    return () => { document.removeEventListener("visibilitychange", recover); window.removeEventListener("online", recover); window.removeEventListener("pageshow", recover); window.removeEventListener(DASHBOARD_UPDATE_EVENT, synchronize); };
  }, [load]);

  return { ...state, retry: load };
}
