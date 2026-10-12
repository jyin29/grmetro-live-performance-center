import { useCallback, useEffect, useRef, useState } from "react";
import { fetchDisplaySettings, setControlsLauncherVisible as saveControlsLauncherVisible } from "../api/managementApi";

const POLL_MS = 30_000;

export function useDisplaySettings() {
  const [state, setState] = useState({ settings: null, error: null });
  const serializedRef = useRef(null);

  useEffect(() => {
    let active = true;
    const load = () => fetchDisplaySettings()
      .then(({ settings }) => {
        if (!active) return;
        const serialized = JSON.stringify(settings ?? null);
        if (serializedRef.current === serialized) {
          setState((current) => current.error ? { ...current, error: null } : current);
          return;
        }
        serializedRef.current = serialized;
        setState({ settings, error: null });
      })
      .catch((error) => active && setState((current) => current.error?.message === error.message ? current : { ...current, error }));
    load();
    const interval = window.setInterval(load, POLL_MS);
    return () => { active = false; window.clearInterval(interval); };
  }, []);

  const setControlsLauncherVisible = useCallback(async (displayId, visible) => {
    const result = await saveControlsLauncherVisible(displayId, visible);
    const settings = result.settings ?? null;
    serializedRef.current = JSON.stringify(settings);
    setState({ settings, error: null });
    return result;
  }, []);
  return { ...state, setControlsLauncherVisible };
}
