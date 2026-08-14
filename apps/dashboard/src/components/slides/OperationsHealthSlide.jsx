import { AnimatedMetric } from "../AnimatedMetric";

const METRICS = [
  "billableServiceCalls",
  "opportunities",
  "membershipsSold",
  "installs",
  "installAverageTicket",
  "installRevenue",
];

function metricFor(row, metricId) {
  return row.metrics?.find((metric) => metric.id === metricId);
}

function findMetric(data, technicianId, metricId) {
  for (const slide of [data.slides.activity, data.slides["average-ticket"]]) {
    const row = slide?.rows?.find((item) => item.technicianId === technicianId);
    const metric = metricFor(row || {}, metricId);
    if (metric) return { metric, slide };
  }
  return { metric: null, slide: null };
}

function definitionFor(data, metricId) {
  return data.slides.activity?.metrics?.find((metric) => metric.id === metricId)
    || data.slides["average-ticket"]?.metrics?.find((metric) => metric.id === metricId);
}

function visualRatio(slide, metricId, metric) {
  if (!metric?.hasData || !slide) return 0;
  if (metric.goal > 0) return Math.max(0, Math.min(1, Number(metric.value) / Number(metric.goal)));
  const maximum = Math.max(0, ...slide.rows.map((row) => metricFor(row, metricId)).filter((item) => item?.hasData).map((item) => Number(item.value) || 0));
  return maximum > 0 ? Math.max(0, Math.min(.8, ((Number(metric.value) || 0) / maximum) * .8)) : 0;
}

function TechnicianColumns({ data }) {
  const activityRows = data.slides.activity?.rows || [];
  const economicsRows = data.slides["average-ticket"]?.rows || [];
  const technicians = [...activityRows, ...economicsRows].filter((row, index, rows) => rows.findIndex((candidate) => candidate.technicianId === row.technicianId) === index);
  if (!technicians.length) return <p className="chart-empty">Operations data is not available yet.</p>;

  return <div className="operations-technician-columns" aria-label="Operations metrics by technician">
    {technicians.map((technician) => <article className="operations-technician-column" key={technician.technicianId}>
      <header><strong>{technician.shortName || technician.name}</strong></header>
      <div className="operations-technician-column__metrics">
        {METRICS.map((metricId) => {
          const definition = definitionFor(data, metricId);
          const { metric, slide } = findMetric(data, technician.technicianId, metricId);
          if (!definition) return null;
          return <div className="operations-column-metric" key={`${technician.technicianId}-${metricId}`}>
            <span>{definition.shortLabel || definition.label}</span>
            <b>{metric?.hasData ? <AnimatedMetric metric={metric} /> : "—"}</b>
            <i aria-hidden="true"><span style={{ width: `${visualRatio(slide, metricId, metric) * 100}%`, backgroundColor: definition.color }} /></i>
          </div>;
        })}
      </div>
    </article>)}
  </div>;
}

export function OperationsHealthSlide({ data }) {
  const periodLabel = data.period === "mtd" ? "Month to Date" : "Today";
  return <main className="operations-health dashboard-slide domain-slide operations-columns-slide" aria-labelledby="operations-health-title">
    <header className="attention-heading"><div><p>{periodLabel}</p><h2 id="operations-health-title">Operations</h2></div><span>Calls · Installs · Field Activity</span></header>
    <section className="panel operations-columns-panel" aria-labelledby="operations-overview-title">
      <div className="panel__heading"><div><p>{periodLabel} performance</p><h3 id="operations-overview-title">Operations by Technician</h3></div><span>Activity and install performance</span></div>
      <TechnicianColumns data={data} />
    </section>
  </main>;
}
