import { KpiComparisonChart } from "../KpiComparisonChart";

export function OperationsHealthSlide({ data }) {
  return <main className="operations-health dashboard-slide" aria-labelledby="operations-health-title">
    <header className="attention-heading"><div><p>Tier 1 + Tier 2</p><h2 id="operations-health-title">Operations</h2></div><span>Throughput and install value</span></header>
    <section className="panel operations-domain__panel"><div className="panel__heading"><div><p>Daily field throughput</p><h3>Service &amp; Install Activity</h3></div><span>Unavailable mappings remain visible</span></div><KpiComparisonChart slide={data.slides.activity} /></section>
    <section className="panel operations-domain__panel"><div className="panel__heading"><div><p>Install economics</p><h3>Average Ticket &amp; Install Revenue</h3></div><span>No estimates</span></div><KpiComparisonChart slide={data.slides["average-ticket"]} /></section>
  </main>;
}
