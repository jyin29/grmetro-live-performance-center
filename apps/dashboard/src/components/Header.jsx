import { StatusBadge } from "./StatusBadge";
import { freshness, refreshLabel } from "../lib/presentation";
import logoUrl from "../../../../assets/branding/grmetro-logo.png";

export function Header({ refreshedAt, refreshing, hasError }) {
  const state = freshness(refreshedAt);
  const tone = hasError || state !== "live" ? "warning" : "live";
  return <header className="header">
    <img className="header__logo" src={logoUrl} alt="GRmetro Heating & Cooling" />
    <div className="header__title"><p>GRmetro Heating &amp; Cooling</p><h1>Live Performance Center</h1></div>
    <StatusBadge tone={tone}><span className="live-dot" />{refreshing ? "Refreshing…" : refreshLabel(refreshedAt)}</StatusBadge>
  </header>;
}
