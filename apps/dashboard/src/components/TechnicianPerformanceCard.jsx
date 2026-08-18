import { StatusBadge } from "./StatusBadge";
import { TechnicianMetric } from "./TechnicianMetric";
import { useChangeHighlight } from "../hooks/useChangeHighlight";
import { ComparisonValue } from "./ComparisonValue";
import { TrendIndicator } from "./TrendIndicator";
import { technicianHistory } from "../lib/historicalPresentation";
import { displayRank } from "../lib/presentation";

const preferredMetrics = [
  ["revenue", "Revenue"], ["closingRate", "Closing %"], ["billableServiceCalls", "Billable Calls"],
  ["installRevenue", "Install Revenue"], ["installAverageTicket", "Average Ticket"], ["opportunities", "Opportunities"],
  ["techLeads", "Tech Leads"], ["marketedLeads", "Marketed Leads"], ["membershipsSold", "Memberships"],
  ["serviceRevenue", "Service Revenue"], ["leadConversionRate", "Lead Conversion %"], ["installs", "Installs"]
];
function rankMovement(change) { if (change > 0) return { label: `Up ${change}`, symbol: "↑", tone: "up" }; if (change < 0) return { label: `Down ${Math.abs(change)}`, symbol: "↓", tone: "down" }; return { label: "No movement", symbol: "—", tone: "steady" }; }
export function TechnicianPerformanceCard({ technician, data, metricVisibility }) {
  const availableMetrics = preferredMetrics.filter(([id]) => metricVisibility?.[id] !== false && technician.kpis?.[id]?.hasData);
  const metrics = availableMetrics.slice(0, 5); const shownRank = displayRank(technician); const movement = rankMovement(technician.overall?.rankChange);
  const qualities = [...new Set(metrics.map(([id]) => technician.kpis?.[id]?.dataQuality).filter(Boolean))];
  const changeSignature = `${technician.overall?.rank}:${metrics.map(([id]) => `${technician.kpis?.[id]?.hasData}:${technician.kpis?.[id]?.value}`).join("|")}`;
  const highlighted = useChangeHighlight(changeSignature); const history = technicianHistory(data, technician.id);
  return <article className={`performance-card${highlighted ? " is-updated" : ""}`}>
    <header className="performance-card__header"><span className="performance-card__avatar" aria-hidden="true">{technician.initials}</span><div className="performance-card__identity"><h3>{technician.name}</h3><span>{shownRank.label}</span>{shownRank.source !== "overall" && <small>Overall Rank · {shownRank.overallStatus}</small>}</div><div className="performance-card__ranking"><strong>{shownRank.rankLabel}</strong>{history.comparison?.overallRanking?.available ? <ComparisonValue comparison={history.comparison.overallRanking} kind="rank" /> : <span className={`performance-card__movement performance-card__movement--${movement.tone}`} aria-label={movement.label}>{movement.symbol}{movement.tone !== "steady" && Math.abs(technician.overall.rankChange)}</span>}<TrendIndicator trend={history.trends?.overallRanking} streakNoun="improvements" /></div></header>
    <div className="performance-card__metrics">{metrics.length ? metrics.map(([id, label]) => <TechnicianMetric key={id} label={label} metric={technician.kpis?.[id]} />) : <p className="chart-empty">No metrics enabled.</p>}</div>
    {qualities.some((quality) => quality !== "confirmed") && <footer className="performance-card__status"><span>Data status</span><div>{qualities.filter((quality) => quality !== "confirmed").map((quality) => <StatusBadge key={quality} tone={quality === "unavailable" ? "neutral" : "live"}>{quality}</StatusBadge>)}</div></footer>}
  </article>;
}
