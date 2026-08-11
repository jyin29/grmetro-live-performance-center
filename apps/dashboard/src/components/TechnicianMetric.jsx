import { AnimatedMetric } from "./AnimatedMetric";

export function TechnicianMetric({ label, metric }) {
  return <div className="technician-metric">
    <span>{label}</span>
    <strong><AnimatedMetric metric={metric} /></strong>
  </div>;
}
