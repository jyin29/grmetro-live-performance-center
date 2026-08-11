import { formatMetric } from "../lib/presentation";

export function TechnicianMetric({ label, metric }) {
  return <div className="technician-metric">
    <span>{label}</span>
    <strong>{formatMetric(metric)}</strong>
  </div>;
}
