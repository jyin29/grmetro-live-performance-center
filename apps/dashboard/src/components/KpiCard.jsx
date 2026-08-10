import { formatMetric } from "../lib/presentation";
import { StatusBadge } from "./StatusBadge";

export function KpiCard({ item }) {
  return <article className="kpi-card">
    <div className="kpi-card__top"><p>{item.label}</p><StatusBadge tone={item.metric?.dataQuality === "unavailable" ? "neutral" : "live"}>{item.metric?.dataQuality ?? "unavailable"}</StatusBadge></div>
    <strong>{formatMetric(item.metric)}</strong>
    <span>{item.metric?.hasData ? `Leader: ${item.technician}` : "Waiting for confirmed data"}</span>
  </article>;
}
