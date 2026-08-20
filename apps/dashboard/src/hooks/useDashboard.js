import { useCallback, useEffect, useRef, useState } from "react";
import { fetchDashboard } from "../api/dashboardApi";

// Normal cached-dashboard polling stays responsive, but when the backend has no
// successful snapshot yet we back off instead of generating a 503 every 5 seconds.
const POLL_INTERVAL_MS = 5_000;
const UNAVAILABLE_POLL_INTERVAL_MS = 30_000;
export const DASHBOARD_UPDATE_EVENT = "grmetro:dashboard-update";

export function useDashboard() {
  const [state, setState] = useState({ data: null, error: null, loading: true, refreshing: false, lastSuccessfulRefresh: null });
  const controllerRef = useRef(null);
  const timeoutRef = useRef(null);
  const unavailableRef = useRef(false);

  const load = useCallback(async ({ background = false } = {}) => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setState((current) => ({ ...current, error: null, loading: !current.data && !background, refreshing: Boolean(current.data) && !background }));
    try {
      const data = await fetchDashboard({ signal: controller.signal });
      unavailableRef.current = false;
      const refreshTime = new Date(data.refreshedAt).getTime();
      setState({ data, error: null, loading: false, refreshing: false, lastSuccessfulRefresh: Number.isFinite(refreshTime) ? refreshTime : null });
      return true;
    } catch (error) {
      if (error.name !== "AbortError") {
        unavailableRef.current = error?.code === "CACHE_UNAVAILABLE";
        setState((current) => ({ ...current, error, loading: false, refreshing: false }));
      }
      return false;
    }
  }, []);

  useEffect(() => {
    let active = true;
    const schedule = (delay) => {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = window.setTimeout(async () => {
        if (!active) return;
        if (!document.hidden) await load({ background: true });
        schedule(unavailableRef.current ? UNAVAILABLE_POLL_INTERVAL_MS : POLL_INTERVAL_MS);
      }, delay);
    };
    load().finally(() => schedule(unavailableRef.current ? UNAVAILABLE_POLL_INTERVAL_MS : POLL_INTERVAL_MS));
    return () => { active = false; window.clearTimeout(timeoutRef.current); controllerRef.current?.abort(); };
  }, [load]);

  useEffect(() => {
    const recover = () => { if (!document.hidden) load({ background: true }); };
    const synchronize = () => load({ background: true });
    document.addEventListener("visibilitychange", recover);
    window.addEventListener("online", recover);
    window.addEventListener("pageshow", recover);
    window.addEventListener(DASHBOARD_UPDATE_EVENT, synchronize);
    return () => {
      document.removeEventListener("visibilitychange", recover);
      window.removeEventListener("online", recover);
      window.removeEventListener("pageshow", recover);
      window.removeEventListener(DASHBOARD_UPDATE_EVENT, synchronize);
    };
  }, [load]);

  return { ...state, retry: load };
}
