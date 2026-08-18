import { useEffect, useState } from "react";
import { fetchSpreadsheetSlide } from "../api/managementApi";

export function useSpreadsheetSlide() {
  const [slide, setSlide] = useState(null);
  useEffect(() => {
    let alive = true;
    const load = () => fetchSpreadsheetSlide().then((result) => { if (alive) setSlide(result.slide); }).catch(() => {});
    load(); const timer = window.setInterval(load, 5_000);
    return () => { alive = false; window.clearInterval(timer); };
  }, []);
  return slide;
}
