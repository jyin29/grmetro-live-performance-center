import { formatMetric } from "../lib/presentation";
import { ChartPanel } from "./ChartPanel";

export function KpiComparisonChart({ slide }) {
  const rows = slide?.rows ?? [];
  const metrics = slide?.metrics ?? [];
  return <ChartPanel eyebrow="Performance" title="KPI comparison" meta="0–100%" className="comparison-chart">
    <div className="chart-legend">{metrics.map((metric) => <span key={metric.id}><i style={{ "--legend-color": metric.color }} />{metric.label}</span>)}</div>
    <div className="comparison-rows">{rows.map((row) => <div className="comparison-row" key={row.technicianId}>
      <strong>{row.shortName}</strong><div className="comparison-bars"><svg viewBox="0 0 100 18" role="img" aria-label={row.metrics.map((metric) => `${metric.label}: ${formatMetric(metric)}`).join(", ")} preserveAspectRatio="none">
        <rect x="0" y="1" width="100" height="16" rx="4" className="comparison-track" />
        {row.metrics.map((metric, index) => <rect key={metric.id} x="0" y={index ? "5" : "1"} width={metric.hasData ? Math.max(0, Math.min(100, metric.normalizedRatio * 100)) : 0} height={index ? "12" : "16"} rx="4" fill={metric.color} opacity={index ? ".72" : ".58"} className="comparison-bar" />)}
      </svg><span>{row.metrics.map(formatMetric).join(" · ")}</span></div>
    </div>)}</div>
  </ChartPanel>;
}
