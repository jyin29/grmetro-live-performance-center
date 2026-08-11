import { useEffect, useState } from "react";
import { StatusBadge } from "./StatusBadge";
import { formatClock, freshness, refreshLabel } from "../lib/presentation";
import logoUrl from "../../../../assets/branding/grmetro-logo.png";

export function Header({ refreshedAt, refreshing, hasError }) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(interval);
  }, []);

  const state = refreshedAt ? freshness(refreshedAt, now) : "waiting";
  const tone = hasError || state === "stale" || state === "critical" ? "warning" : state === "live" ? "live" : "neutral";
  return <header className="header">
    <img className="header__logo" src={logoUrl} alt="GRmetro Heating & Cooling" />
    <div className="header__title"><p>GRmetro Heating &amp; Cooling</p><h1>Live Performance Center</h1></div>
    <div className="header__status">
      <time className="header__clock" dateTime={new Date(now).toISOString()}>{formatClock(now)}</time>
      <StatusBadge tone={tone}>
        <span className="live-dot" />
        <span aria-live="polite">{refreshing ? "Refreshing…" : refreshLabel(refreshedAt, now)}</span>
      </StatusBadge>
    </div>
  </header>;
}
