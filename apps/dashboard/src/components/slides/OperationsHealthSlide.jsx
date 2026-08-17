import { AnimatedMetric } from "../AnimatedMetric";

const ACTIVITY_METRICS = ["billableServiceCalls", "opportunities", "membershipsSold", "installs"];
const INSTALL_METRICS = ["installAverageTicket", "installRevenue"];
function enabled(metricVisibility, id) { return metricVisibility?.[id] !== false; }
function metricFor(row, metricId) { return row.metrics?.find((metric) => metric.id === metricId); }
function visualRatio(slide, metricId, metric) { if (!metric?.hasData) return 0; if (metric.goal > 0) return Math.max(0, Math.min(1, Number(metric.value) / Number(metric.goal))); const maximum = Math.max(0, ...slide.rows.map((row) => metricFor(row, metricId)).filter((item) => item?.hasData).map((item) => Number(item.value) || 0)); return maximum > 0 ? Math.max(0, Math.min(.8, ((Number(metric.value) || 0) / maximum) * .8)) : 0; }
function goalProgress(metric) { const goal = Number(metric?.goal) || 0; if (!metric?.hasData || goal <= 0) return null; const value = Number(metric.value) || 0; return { goal, percentage: Math.max(0, Math.round((value / goal) * 100)) }; }
function MetricValue({ metric }) { if (!metric?.hasData) return <b>—</b>; const progress = goalProgress(metric); if (!progress) return <b><AnimatedMetric metric={metric} /></b>; return <div className="metric-goal-inline"><b><AnimatedMetric metric={metric} /></b><span>/</span><strong>{progress.goal.toLocaleString()}</strong><em>{progress.percentage}%</em></div>; }

function OperationsActivityMatrix({ slide, metricVisibility }) {
  const metrics = ACTIVITY_METRICS.filter((id) => enabled(metricVisibility, id)).map((id) => slide?.metrics?.find((metric) => metric.id === id)).filter(Boolean);
  if (!slide?.rows?.length || !metrics.length) return <p className="chart-empty">No activity metrics are enabled.</p>;
  return <div className="operations-activity-matrix" role="table" aria-label="Calls and field activity by technician" style={{ "--activity-metric-count": metrics.length }}>
    <div className="operations-activity-matrix__header" role="row"><strong role="columnheader">Technician</strong>{metrics.map((metric) => <strong role="columnheader" key={metric.id}>{metric.shortLabel || metric.label}</strong>)}</div>
    <div className="operations-activity-matrix__body">{slide.rows.map((row) => <div className="operations-activity-matrix__row" role="row" key={row.technicianId}><strong role="rowheader">{row.shortName || row.name}</strong>{metrics.map((definition) => { const metric = metricFor(row, definition.id); return <div className="operations-activity-matrix__metric" role="cell" aria-label={`${definition.label}: ${metric?.hasData ? metric.value : "Unavailable"}`} key={`${row.technicianId}-${definition.id}`}><span style={{ width: `${visualRatio(slide, definition.id, metric) * 100}%`, backgroundColor: definition.color }} /><MetricValue metric={metric} /></div>; })}</div>)}</div>
  </div>;
}

function InstallEconomicsRows({ slide, metricVisibility }) {
  const metricIds = INSTALL_METRICS.filter((id) => enabled(metricVisibility, id));
  if (!slide?.rows?.length || !metricIds.length) return <p className="chart-empty">No install economics metrics are enabled.</p>;
  return <div className="install-economics-list" aria-label="Install average ticket and revenue by technician">{slide.rows.map((row) => <div className="install-economics-row" key={row.technicianId}><strong>{row.shortName || row.name}</strong><div className="install-economics-row__metrics">{metricIds.map((metricId) => { const definition = slide.metrics?.find((metric) => metric.id === metricId); const metric = metricFor(row, metricId); if (!definition) return null; return <div className="install-economics-row__metric" key={`${row.technicianId}-${metricId}`}><span>{definition.shortLabel || definition.label}</span><MetricValue metric={metric} /><i aria-hidden="true"><span style={{ width: `${visualRatio(slide, metricId, metric) * 100}%`, backgroundColor: definition.color }} /></i></div>; })}</div></div>)}</div>;
}

export function OperationsHealthSlide({ data, metricVisibility }) {
  const periodLabel = data.period === "mtd" ? "Month to Date" : "Today";
  return <main className="operations-health dashboard-slide domain-slide operations-layout-v2" aria-labelledby="operations-health-title">
    <header className="attention-heading"><div><p>{periodLabel}</p><h2 id="operations-health-title">Operations</h2></div><span>Calls · Installs · Field Activity</span></header>
    <section className="panel operations-domain__panel operations-domain__activity" aria-labelledby="operations-activity-title"><div className="panel__heading"><div><p>{periodLabel} throughput</p><h3 id="operations-activity-title">Calls &amp; Activity</h3></div><span>Configured field metrics</span></div><OperationsActivityMatrix slide={data.slides.activity} metricVisibility={metricVisibility} /></section>
    <section className="panel operations-domain__panel operations-domain__economics" aria-labelledby="operations-economics-title"><div className="panel__heading"><div><p>Install economics</p><h3 id="operations-economics-title">Average Ticket &amp; Revenue</h3></div><span>By technician</span></div><InstallEconomicsRows slide={data.slides["average-ticket"]} metricVisibility={metricVisibility} /></section>
  </main>;
}
