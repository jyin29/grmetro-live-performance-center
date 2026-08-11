import { useEffect, useRef, useState } from "react";

const HIGHLIGHT_DURATION_MS = 1_000;

export function useChangeHighlight(value) {
  const previousValue = useRef(value);
  const [highlighted, setHighlighted] = useState(false);

  useEffect(() => {
    if (previousValue.current === value) return undefined;
    previousValue.current = value;
    setHighlighted(true);
    const timeout = window.setTimeout(() => setHighlighted(false), HIGHLIGHT_DURATION_MS);
    return () => window.clearTimeout(timeout);
  }, [value]);

  return highlighted;
}
