import { AnimatedMetric } from "../AnimatedMetric";

const PIPELINE_METRICS = ["opportunities", "techLeads", "marketedLeads", "membershipsSold"];

function metricFor(row, metricId) {
  return row.metrics?.find((metric) => metric.id === metricId);
}

export function SalesPipelineMatrix({ slide }) {
  const metrics = PIPELINE_METRICS.map((id) => slide?.metrics?.find((metric) => metric.id === id)).filter(Boolean);
  if (!slide?.rows?.length || !metrics.length) return <p className="chart-empty">Sales pipeline data is not available yet.</p>;
  return <div className="sales-pipeline" role="table" aria-label="Sales Pipeline and Lead Activity">
    <div className="sales-pipeline__header" role="row">
      <strong role="columnheader">Technician</strong>
      {metrics.map((metric) => <strong role="columnheader" key={metric.id}>{metric.shortLabel || metric.label}</strong>)}
    </div>
    <div className="sales-pipeline__body">
      {slide.rows.map((row) => <div className="sales-pipeline__row" role="row" key={row.technicianId}>
        <strong role="rowheader">{row.shortName || row.name}</strong>
        {metrics.map((definition) => {
          const metric = metricFor(row, definition.id);
          return <div className="sales-pipeline__metric" role="cell" aria-label={`${definition.label}: ${metric?.hasData ? metric.value : "Unavailable"}`} key={`${row.technicianId}-${definition.id}`}>
            <span style={{ width: `${Math.max(0, Math.min(100, Number(metric?.normalizedRatio) * 100 || 0))}%`, backgroundColor: definition.color }} />
            <b>{metric?.hasData ? <AnimatedMetric metric={metric} /> : "—"}</b>
          </div>;
        })}
      </div>)}
    </div>
  </div>;
}

export function ClosingRateRows({ slide }) {
  if (!slide?.rows?.length) return <p className="chart-empty">Closing data is not available yet.</p>;
  return <div className="closing-list" aria-label="Closing percentage by technician">
    {slide.rows.map((row) => {
      const metric = metricFor(row, "closingRate");
      return <div className="closing-row" key={row.technicianId}>
        <div><strong>{row.shortName || row.name}</strong><b>{metric?.hasData ? <AnimatedMetric metric={metric} /> : "No data"}</b></div>
        <div className="closing-row__bar" aria-hidden="true"><span style={{ width: `${Math.max(0, Math.min(100, Number(metric?.normalizedRatio) * 100 || 0))}%` }} /></div>
      </div>;
    })}
  </div>;
}

export function BusinessPerformanceSlide({ data }) {
  const periodLabel = data.period === "mtd" ? "Month to Date" : "Today";
  return <main className="business-performance dashboard-slide domain-slide" aria-labelledby="business-performance-title">
    <header className="business-performance__heading">
      <div><p>{periodLabel}</p><h2 id="business-performance-title">Sales</h2></div>
      <span>Closing results and pipeline activity</span>
    </header>
    <section className="panel business-performance__conversion" aria-labelledby="business-conversion-title">
      <div className="panel__heading"><div><p>Sales pipeline</p><h3 id="business-conversion-title">Pipeline &amp; Lead Activity</h3></div><span>Four separate counts · shared technician rows</span></div>
      <SalesPipelineMatrix slide={data.slides.activity} />
    </section>
    <section className="panel business-performance__revenue" aria-labelledby="business-revenue-title">
      <div className="panel__heading"><div><p>Primary sales outcome</p><h3 id="business-revenue-title">Closing %</h3></div><span>By technician</span></div>
      <ClosingRateRows slide={data.slides.performance} />
    </section>
  </main>;
}
