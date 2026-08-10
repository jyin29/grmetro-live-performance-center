import { chartMetric, formatMetric, technicianStatus } from "../lib/presentation";
import { StatusBadge } from "./StatusBadge";

export function TechnicianSummaryCard({ technician }) {
  const status = technicianStatus(technician);
  return <article className="technician-summary-card" tabIndex="0">
    <div className="technician-summary-card__identity"><span>{technician.initials}</span><div><h3>{technician.name}</h3><p>{technician.overall?.qualifies ? `Overall rank #${technician.overall.rank}` : "Not yet qualified"}</p></div><StatusBadge tone={status.tone}>{status.label}</StatusBadge></div>
    <dl><div><dt>Revenue</dt><dd>{formatMetric(chartMetric(technician, "revenue"))}</dd></div><div><dt>Closing</dt><dd>{formatMetric(chartMetric(technician, "closingRate"))}</dd></div><div><dt>Calls</dt><dd>{formatMetric(chartMetric(technician, "billableServiceCalls"))}</dd></div></dl>
  </article>;
}
