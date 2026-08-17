import { AnimatedMetric } from "../AnimatedMetric";

const ACTIVITY_METRICS = ["billableServiceCalls", "opportunities", "membershipsSold", "installs"];
const INSTALL_METRICS = ["installAverageTicket", "installRevenue"];

function metricFor(row, metricId) {
  return row.metrics?.find((metric) => metric.id === metricId);
}

function visualRatio(slide, metricId, metric) {
  if (!metric?.hasData) return 0;
  if (metric.goal > 0) return Math.max(0, Math.min(1, Number(metric.value) / Number(metric.goal)));
  const maximum = Math.max(0, ...slide.rows.map((row) => metricFor(row, metricId)).filter((item) => item?.hasData).map((item) => Number(item.value) || 0));
  return maximum > 0 ? Math.max(0, Math.min(.8, ((Number(metric.value) || 0) / maximum) * .8)) : 0;
}

function goalProgress(metric) {
  const goal = Number(metric?.goal) || 0;
  if (!metric?.hasData || goal <= 0) return null;
  const value = Number(metric.value) || 0;
  return { goal, percentage: Math.max(0, Math.round((value / goal) * 100)) };
}

function GoalProgress({ metric }) {
  const progress = goalProgress(metric);
  if (!progress) return null;
  return <small className="metric-goal-progress">Goal {progress.goal.toLocaleString()} · {progress.percentage}%</small>;
}

function OperationsActivityMatrix({ slide }) {
  const metrics = ACTIVITY_METRICS.map((id) => slide?.metrics?.find((metric) => metric.id === id)).filter(Boolean);
  if (!slide?.rows?.length || !metrics.length) return <p className="chart-empty">Operations activity data is not available yet.</p>;
  return <div className="operations-activity-matrix" role="table" aria-label="Calls and field activity by technician">
    <div className="operations-activity-matrix__header" role="row">
      <strong role="columnheader">Technician</strong>
      {metrics.map((metric) => <strong role="columnheader" key={metric.id}>{metric.shortLabel || metric.label}</strong>)}
    </div>
    <div className="operations-activity-matrix__body">
      {slide.rows.map((row) => <div className="operations-activity-matrix__row" role="row" key={row.technicianId}>
        <strong role="rowheader">{row.shortName || row.name}</strong>
        {metrics.map((definition) => {
          const metric = metricFor(row, definition.id);
          return <div className="operations-activity-matrix__metric" role="cell" aria-label={`${definition.label}: ${metric?.hasData ? metric.value : "Unavailable"}`} key={`${row.technicianId}-${definition.id}`}>
            <span style={{ width: `${visualRatio(slide, definition.id, metric) * 100}%`, backgroundColor: definition.color }} />
            <div className="metric-value-with-goal"><b>{metric?.hasData ? <AnimatedMetric metric={metric} /> : "—"}</b><GoalProgress metric={metric} /></div>
          </div>;
        })}
      </div>)}
    </div>
  </div>;
}

function InstallEconomicsRows({ slide }) {
  if (!slide?.rows?.length) return <p className="chart-empty">Install economics data is not available yet.</p>;
  return <div className="install-economics-list" aria-label="Install average ticket and revenue by technician">
    {slide.rows.map((row) => <div className="install-economics-row" key={row.technicianId}>
      <strong>{row.shortName || row.name}</strong>
      <div className="install-economics-row__metrics">
        {INSTALL_METRICS.map((metricId) => {
          const definition = slide.metrics?.find((metric) => metric.id === metricId);
          const metric = metricFor(row, metricId);
          if (!definition) return null;
          return <div className="install-economics-row__metric" key={`${row.technicianId}-${metricId}`}>
            <span>{definition.shortLabel || definition.label}</span>
            <div className="metric-value-with-goal metric-value-with-goal--right"><b>{metric?.hasData ? <AnimatedMetric metric={metric} /> : "—"}</b><GoalProgress metric={metric} /></div>
            <i aria-hidden="true"><span style={{ width: `${visualRatio(slide, metricId, metric) * 100}%`, backgroundColor: definition.color }} /></i>
          </div>;
        })}
      </div>
    </div>)}
  </div>;
}

export function OperationsHealthSlide({ data }) {
  const periodLabel = data.period === "mtd" ? "Month to Date" : "Today";
  return <main className="operations-health dashboard-slide domain-slide operations-layout-v2" aria-labelledby="operations-health-title">
    <header className="attention-heading"><div><p>{periodLabel}</p><h2 id="operations-health-title">Operations</h2></div><span>Calls · Installs · Field Activity</span></header>
    <section className="panel operations-domain__panel operations-domain__activity" aria-labelledby="operations-activity-title">
      <div className="panel__heading"><div><p>{periodLabel} throughput</p><h3 id="operations-activity-title">Calls &amp; Activity</h3></div><span>Four separate counts · shared technician rows</span></div>
      <OperationsActivityMatrix slide={data.slides.activity} />
    </section>
    <section className="panel operations-domain__panel operations-domain__economics" aria-labelledby="operations-economics-title">
      <div className="panel__heading"><div><p>Install economics</p><h3 id="operations-economics-title">Average Ticket &amp; Revenue</h3></div><span>By technician</span></div>
      <InstallEconomicsRows slide={data.slides["average-ticket"]} />
    </section>
  </main>;
}
