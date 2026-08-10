import { useCallback, useEffect, useRef, useState } from "react";
import { fetchDashboard } from "../api/dashboardApi";

const POLL_INTERVAL_MS = 60_000;

export function useDashboard() {
  const [state, setState] = useState({ data: null, error: null, loading: true, refreshing: false });
  const controllerRef = useRef(null);

  const load = useCallback(async ({ background = false } = {}) => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setState((current) => ({ ...current, error: null, loading: !current.data && !background, refreshing: Boolean(current.data) }));
    try {
      const data = await fetchDashboard({ signal: controller.signal });
      setState({ data, error: null, loading: false, refreshing: false });
    } catch (error) {
      if (error.name !== "AbortError") setState((current) => ({ ...current, error, loading: false, refreshing: false }));
    }
  }, []);

  useEffect(() => {
    load();
    const interval = window.setInterval(() => load({ background: true }), POLL_INTERVAL_MS);
    return () => { window.clearInterval(interval); controllerRef.current?.abort(); };
  }, [load]);

  return { ...state, retry: load };
}
