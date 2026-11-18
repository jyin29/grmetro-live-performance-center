import { AnimatedMetric } from "./AnimatedMetric";
import { formatMetric } from "../lib/presentation";

function goalPresentation(metric) {
  const goal = Number(metric?.goal);
  if (!(goal > 0) || !Number.isFinite(goal)) return null;
  const percentComplete = Number(metric?.percentComplete);
  return {
    goal: formatMetric({ ...metric, value: goal, hasData: true }),
    attainment: Number.isFinite(percentComplete) ? Math.max(0, Math.round(percentComplete)) : null,
  };
}

export function GoalProgressValue({ metric, unavailable = "N/A", className = "" }) {
  const available = metric?.hasData === true && Number.isFinite(Number(metric.value));
  const progress = available ? goalPresentation(metric) : null;
  return <div className={`goal-progress-value${className ? ` ${className}` : ""}`}>
    <b className="goal-progress-value__actual">{available ? <AnimatedMetric metric={metric} /> : unavailable}</b>
    {progress && <span className="goal-progress-value__goal">of <strong>{progress.goal}</strong> goal</span>}
    {progress && progress.attainment !== null && <em className="goal-progress-value__attainment">{progress.attainment}% of goal achieved</em>}
  </div>;
}
