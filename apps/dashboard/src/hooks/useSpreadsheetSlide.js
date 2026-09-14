import { useEffect, useRef, useState } from "react";
import { fetchSpreadsheetSlide } from "../api/managementApi";

const POLL_MS = 30_000;

export function useSpreadsheetSlide() {
  const [slide, setSlide] = useState(null);
  const serializedRef = useRef(null);
  useEffect(() => {
    let alive = true;
    const load = () => fetchSpreadsheetSlide().then((result) => {
      if (!alive) return;
      const next = result.slide ?? null;
      const serialized = JSON.stringify(next);
      if (serializedRef.current === serialized) return;
      serializedRef.current = serialized;
      setSlide(next);
    }).catch(() => {});
    load(); const timer = window.setInterval(load, POLL_MS);
    return () => { alive = false; window.clearInterval(timer); };
  }, []);
  return slide;
}
