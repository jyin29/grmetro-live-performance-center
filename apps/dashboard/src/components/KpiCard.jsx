import { AnimatedMetric } from "./AnimatedMetric";
import { useChangeHighlight } from "../hooks/useChangeHighlight";
import { StatusBadge } from "./StatusBadge";

export function KpiCard({ item }) {
  const highlighted = useChangeHighlight(`${item.metric?.hasData}:${item.metric?.value}:${item.technician}`);
  return <article className={`kpi-card${highlighted ? " is-updated" : ""}`}>
    <div className="kpi-card__top"><p>{item.label}</p><StatusBadge tone={item.metric?.dataQuality === "unavailable" ? "neutral" : "live"}>{item.metric?.dataQuality ?? "unavailable"}</StatusBadge></div>
    <strong><AnimatedMetric metric={item.metric} /></strong>
    <span>{item.metric?.hasData ? `Leader: ${item.technician}` : "Waiting for confirmed data"}</span>
  </article>;
}
