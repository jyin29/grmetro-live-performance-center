import { AnimatedMetric } from "./AnimatedMetric";

export function TechnicianMetric({ label, metric, metricId }) {
  const unavailable=!metric?.hasData;
  return <div className={`technician-metric technician-metric--${metricId||metric?.id||"unknown"}${unavailable?" is-unavailable":""}`}>
    <span>{label}</span>
    <strong>{unavailable?<span className="metric-unavailable" aria-label={`${label} unavailable`}>— <small>Unavailable</small></span>:<AnimatedMetric metric={metric} />}</strong>
  </div>;
}
