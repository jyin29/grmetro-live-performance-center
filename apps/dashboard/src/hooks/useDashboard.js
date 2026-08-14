import { useCallback, useEffect, useRef, useState } from "react";
import { fetchDashboard } from "../api/dashboardApi";

const POLL_INTERVAL_MS = 60_000;
export const DASHBOARD_UPDATE_EVENT = "grmetro:dashboard-update";

export function useDashboard() {
  const [state, setState] = useState({ data: null, error: null, loading: true, refreshing: false, lastSuccessfulRefresh: null });
  const controllerRef = useRef(null);

  const load = useCallback(async ({ background = false } = {}) => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setState((current) => ({ ...current, error: null, loading: !current.data && !background, refreshing: Boolean(current.data) }));
    try {
      const data = await fetchDashboard({ signal: controller.signal });
      const refreshTime = new Date(data.refreshedAt).getTime();
      setState({ data, error: null, loading: false, refreshing: false,
        lastSuccessfulRefresh: Number.isFinite(refreshTime) ? refreshTime : null });
    } catch (error) {
      if (error.name !== "AbortError") setState((current) => ({ ...current, error, loading: false, refreshing: false }));
    }
  }, []);

  useEffect(() => {
    load();
    const interval = window.setInterval(() => load({ background: true }), POLL_INTERVAL_MS);
    return () => { window.clearInterval(interval); controllerRef.current?.abort(); };
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
