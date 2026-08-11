import { formatMetric } from "../lib/presentation";

const VIEWBOX_WIDTH = 760;
const LABEL_WIDTH = 126;
const PLOT_WIDTH = 590;

function barWidth(ratio) {
  return Math.max(0, Math.min(1, Number(ratio) || 0)) * PLOT_WIDTH;
}

export function RevenueChart({ slide }) {
  if (!slide?.rows?.length) return <p className="chart-empty">Revenue data is not available yet.</p>;

  return <div className="chart-wrap">
    <div className="chart-legend" aria-label="Revenue chart legend">
      {slide.metrics.map((metric) => <span key={metric.id}><i style={{ backgroundColor: metric.color }} />{metric.label}</span>)}
    </div>
    <svg className="revenue-chart" viewBox={`0 0 ${VIEWBOX_WIDTH} ${slide.rows.length * 74 + 40}`} role="img" aria-labelledby="revenue-chart-title revenue-chart-description">
      <title id="revenue-chart-title">Revenue by technician</title>
      <desc id="revenue-chart-description">Overlaid total, service, and installation revenue bars for each technician.</desc>
      {slide.rows.map((row, rowIndex) => {
        const y = rowIndex * 74 + 28;
        return <g key={row.technicianId}>
          <text className="chart-name" x="0" y={y + 8}>{row.shortName || row.name}</text>
          <rect className="chart-track" x={LABEL_WIDTH} y={y - 9} width={PLOT_WIDTH} height="26" rx="13" />
          {row.metrics.map((metric, metricIndex) => <rect key={`${row.technicianId}-${metric.id}`} x={LABEL_WIDTH} y={y - 8 + metricIndex * 5} width={barWidth(metric.normalizedRatio)} height={16 - metricIndex * 3} rx="7" fill={slide.metrics.find(({ id }) => id === metric.id)?.color} opacity={metricIndex === 0 ? .72 : .82} />)}
          <text className="chart-value" x={VIEWBOX_WIDTH - 2} y={y + 8} textAnchor="end">{formatMetric(row.metrics[0])}</text>
        </g>;
      })}
      <line className="chart-axis" x1={LABEL_WIDTH} y1={slide.rows.length * 74 + 8} x2={LABEL_WIDTH + PLOT_WIDTH} y2={slide.rows.length * 74 + 8} />
      <text className="chart-tick" x={LABEL_WIDTH} y={slide.rows.length * 74 + 30}>$0</text>
      <text className="chart-tick" x={LABEL_WIDTH + PLOT_WIDTH} y={slide.rows.length * 74 + 30} textAnchor="end">{formatMetric({ value: slide.axis.maximum, hasData: true, format: slide.axis.format })}</text>
    </svg>
  </div>;
}

