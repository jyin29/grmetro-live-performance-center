import { chartMetric, formatMetric, rankChangeLabel } from "../lib/presentation";
import { ChartPanel } from "./ChartPanel";

export function RevenueTrendChart({ technicians }) {
  const points = technicians.map((technician) => ({ technician, metric: chartMetric(technician, "revenue") }));
  const available = points.filter(({ metric }) => metric?.hasData);
  const max = Math.max(1, ...available.map(({ metric }) => metric.value));
  const coordinates = available.map(({ metric }, index) => ({ x: available.length === 1 ? 50 : 7 + (index * 86 / (available.length - 1)), y: 82 - (metric.value / max * 61) }));
  const line = coordinates.map(({ x, y }) => `${x},${y}`).join(" ");
  return <ChartPanel eyebrow="Current snapshot" title="Revenue trend" meta="Rank movement" className="revenue-chart">
    {available.length ? <div className="trend-chart">
      <svg viewBox="0 0 100 100" role="img" aria-label="Current technician revenue with backend-provided rank movement" preserveAspectRatio="none">
        <defs><linearGradient id="revenue-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#d4af37" stopOpacity=".38"/><stop offset="1" stopColor="#d4af37" stopOpacity=".02"/></linearGradient></defs>
        {[21, 41, 61, 82].map((y) => <line key={y} x1="5" x2="95" y1={y} y2={y} className="chart-gridline" />)}
        {coordinates.length > 1 && <><polygon points={`7,82 ${line} 93,82`} fill="url(#revenue-fill)"/><polyline points={line} className="trend-line" /></>}
        {coordinates.map(({ x, y }, index) => <circle key={available[index].technician.id} cx={x} cy={y} r="2.4" className="trend-point" />)}
      </svg>
      <div className="trend-labels">{available.map(({ technician, metric }) => <div key={technician.id}><strong>{formatMetric(metric)}</strong><span>{technician.shortName}</span><small>{rankChangeLabel(metric.rankChange)}</small></div>)}</div>
    </div> : <p className="chart-empty">Revenue data is unavailable.</p>}
  </ChartPanel>;
}
