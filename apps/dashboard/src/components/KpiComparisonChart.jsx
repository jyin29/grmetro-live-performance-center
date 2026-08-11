import { formatMetric } from "../lib/presentation";

export function KpiComparisonChart({ slide }) {
  if (!slide?.rows?.length) return <p className="chart-empty">Performance data is not available yet.</p>;

  return <div className="comparison-chart" aria-label="KPI comparison chart">
    <div className="chart-legend">
      {slide.metrics.map((metric) => <span key={metric.id}><i style={{ backgroundColor: metric.color }} />{metric.label}</span>)}
    </div>
    <div className="comparison-chart__rows">
      {slide.rows.map((row) => <div className="comparison-row" key={row.technicianId}>
        <strong>{row.shortName || row.name}</strong>
        <div className="comparison-row__metrics">
          {row.metrics.map((metric) => <div className="comparison-bar" key={`${row.technicianId}-${metric.id}`}>
            <span style={{ width: `${Math.max(0, Math.min(100, Number(metric.normalizedRatio) * 100 || 0))}%`, backgroundColor: slide.metrics.find(({ id }) => id === metric.id)?.color }} />
            <b>{formatMetric(metric)}</b>
          </div>)}
        </div>
      </div>)}
    </div>
  </div>;
}

