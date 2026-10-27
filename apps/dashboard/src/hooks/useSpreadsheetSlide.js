import { useEffect, useRef, useState } from "react";
import { fetchSpreadsheetSlide } from "../api/managementApi";

const POLL_MS = 30_000;

export function useSpreadsheetSlide(refreshKey = null) {
  const [resource, setResource] = useState({ available: false, loaded: false, slide: null });
  const serializedRef = useRef(null);
  useEffect(() => {
    let alive = true;
    const load = () => fetchSpreadsheetSlide().then((result) => {
      if (!alive) return;
      const next = { available: result.available === true, loaded: true, slide: result.slide ?? null };
      const serialized = JSON.stringify(next);
      if (serializedRef.current === serialized) return;
      serializedRef.current = serialized;
      setResource(next);
    }).catch(() => {});
    load(); const timer = window.setInterval(load, POLL_MS);
    return () => { alive = false; window.clearInterval(timer); };
  }, [refreshKey]);
  return resource;
}
