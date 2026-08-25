import { useEffect, useState } from "react";
import { StatusBadge } from "./StatusBadge";
import { formatClock, freshness, refreshLabel } from "../lib/presentation";
import { branding } from "../config/branding";

export function Header({ refreshedAt, refreshing, hasError }) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(interval);
  }, []);

  const state = refreshedAt ? freshness(refreshedAt, now) : "waiting";
  const tone = hasError || state === "stale" || state === "critical" ? "warning" : state === "live" ? "live" : "neutral";
  const refreshedTime = refreshedAt && Number.isFinite(new Date(refreshedAt).getTime())
    ? new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit" }).format(new Date(refreshedAt))
    : "—";
  const ageLabel = refreshLabel(refreshedAt, now).replace(/^Updated /, "");
  return <header className="header">
    <img className="header__logo" src={branding.logoUrl} alt={branding.companyName} />
    <div className="header__title"><p>{branding.companyName}</p><h1>{branding.applicationName}</h1></div>
    <div className="header__status">
      <StatusBadge tone={tone}><span className="live-dot" /><span>{refreshing ? "Refreshing" : state === "live" ? "Live" : "Attention"}</span></StatusBadge>
      <div className="header__time-block">
        <span>Local time</span>
        <time className="header__clock" dateTime={new Date(now).toISOString()}>{formatClock(now)}</time>
      </div>
      <div className="header__refresh-block">
        <span>Last refresh</span>
        <strong>{refreshedTime}</strong>
        <small aria-live="polite">{refreshing ? "Updating now" : ageLabel}</small>
      </div>
    </div>
  </header>;
}
