import { AnimatedMetric } from "./AnimatedMetric";
import { ComparisonValue } from "./ComparisonValue";
import { TrendBadge } from "./TrendBadge";
import { metricHistory } from "../lib/historicalPresentation";

export function KpiComparisonChart({ slide, data }) {
  if (!slide?.rows?.length) return <p className="chart-empty">Performance data is not available yet.</p>;

  return <div className="comparison-chart" aria-label="KPI comparison chart">
    <div className="chart-legend">
      {slide.metrics.map((metric) => <span key={metric.id}><i style={{ backgroundColor: metric.color }} />{metric.label}</span>)}
    </div>
    <div className="comparison-chart__rows">
      {slide.rows.map((row) => <div className="comparison-row" key={row.technicianId}>
        <strong>{row.shortName || row.name}</strong>
        <div className="comparison-row__metrics">
          {row.metrics.map((metric) => {
            const history = metricHistory(data, row.technicianId, metric.id);
            return <div className="comparison-metric" key={`${row.technicianId}-${metric.id}`}><div className="comparison-bar">
            <span style={{ width: `${Math.max(0, Math.min(100, Number(metric.normalizedRatio) * 100 || 0))}%`, backgroundColor: slide.metrics.find(({ id }) => id === metric.id)?.color }} />
            <b><AnimatedMetric metric={metric} /></b>
            </div><span className="comparison-metric__context"><ComparisonValue comparison={history.comparison?.value} format={metric.format} /><TrendBadge trend={history.trends?.value} /></span></div>;
          })}
        </div>
      </div>)}
    </div>
  </div>;
}
