import { AnimatedMetric } from "./AnimatedMetric";
import { GoalProgressValue } from "./GoalProgressValue";

export function TechnicianMetric({ label, metric, metricId }) {
  const unavailable=!metric?.hasData;
  const resolvedId=metricId||metric?.id||"unknown";
  return <div className={`technician-metric technician-metric--${resolvedId}${unavailable?" is-unavailable":""}`}>
    <span>{label}</span>
    {resolvedId==="closingRate"?<GoalProgressValue metric={metric}/>:<strong>{unavailable?<span className="metric-unavailable" aria-label={`${label} unavailable`}>— <small>Unavailable</small></span>:<AnimatedMetric metric={metric} />}</strong>}
  </div>;
}
