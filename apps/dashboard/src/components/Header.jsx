import { useEffect, useState } from "react";
import { StatusBadge } from "./StatusBadge";
import { clockParts, freshness, refreshLabel, refreshTime } from "../lib/presentation";
import logoUrl from "../../../../assets/branding/grmetro-logo.png";

export function Header({ refreshedAt, refreshing, hasError }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(interval);
  }, []);
  const state = refreshing ? "refreshing" : freshness(refreshedAt, now);
  const clock = clockParts(now);
  return <header className="header">
    <img className="header__logo" src={logoUrl} alt="GRmetro Heating & Cooling" />
    <div className="header__title"><p>GRmetro Heating &amp; Cooling</p><h1>Live Performance Center</h1></div>
    <div className="header__status">
      <div className="live-clock" aria-label={`${clock.weekday}, ${clock.date} at ${clock.time}`}>
        <span>{clock.weekday} <b>{clock.date}</b></span>
        <time dateTime={new Date(now).toISOString()}>{clock.time}</time>
      </div>
      <div className="refresh-status">
        <div className="refresh-status__time"><span>Last Refresh</span><strong>{refreshTime(refreshedAt)}</strong><small>{refreshLabel(refreshedAt, now)}</small></div>
        <StatusBadge tone={state}><span className="live-dot" />{state === "refreshing" ? "Refreshing" : state === "stale" ? "Stale" : state === "offline" ? "Offline" : "Live"}</StatusBadge>
      </div>
      {hasError && <span className="visually-hidden">The most recent dashboard request failed.</span>}
    </div>
  </header>;
}
