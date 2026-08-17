import { useEffect, useState } from "react";
import { fetchDisplaySettings } from "../api/managementApi";

const POLL_MS = 5_000;

export function useDisplaySettings() {
  const [state, setState] = useState({ settings: null, error: null });

  useEffect(() => {
    let active = true;
    const load = () => fetchDisplaySettings()
      .then(({ settings }) => active && setState({ settings, error: null }))
      .catch((error) => active && setState((current) => ({ ...current, error })));
    load();
    const interval = window.setInterval(load, POLL_MS);
    return () => { active = false; window.clearInterval(interval); };
  }, []);

  return state;
}
