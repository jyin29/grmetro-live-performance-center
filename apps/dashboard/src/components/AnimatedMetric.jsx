import { useEffect, useRef, useState } from "react";
import { formatMetric } from "../lib/presentation";

const VALUE_ANIMATION_DURATION_MS = 650;
const EASE_OUT = (progress) => 1 - Math.pow(1 - progress, 3);

function reducedMotionRequested() {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

export function AnimatedMetric({ metric, className }) {
  const target = metric?.hasData && Number.isFinite(Number(metric.value)) ? Number(metric.value) : null;
  const displayedValue = useRef(target);
  const [displayed, setDisplayed] = useState(target);

  useEffect(() => {
    const start = displayedValue.current;
    if (target === null || start === null || start === target || reducedMotionRequested()) {
      displayedValue.current = target;
      setDisplayed(target);
      return undefined;
    }

    let frame;
    const startedAt = performance.now();
    const animate = (now) => {
      const progress = Math.min(1, (now - startedAt) / VALUE_ANIMATION_DURATION_MS);
      const nextValue = start + ((target - start) * EASE_OUT(progress));
      displayedValue.current = nextValue;
      setDisplayed(nextValue);
      if (progress < 1) frame = window.requestAnimationFrame(animate);
    };
    frame = window.requestAnimationFrame(animate);
    return () => window.cancelAnimationFrame(frame);
  }, [target]);

  const presentationMetric = target === null ? metric : { ...metric, value: displayed };
  return <span className={className}>{formatMetric(presentationMetric)}</span>;
}
