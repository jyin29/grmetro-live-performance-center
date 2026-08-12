import { KpiComparisonChart } from "../KpiComparisonChart";

export function OperationsHealthSlide({ data }) {
  return <main className="operations-health dashboard-slide" aria-labelledby="operations-health-title">
    <header className="attention-heading"><div><p>Today</p><h2 id="operations-health-title">Operations</h2></div><span>Calls, installs, and field activity</span></header>
    <section className="panel operations-domain__panel"><div className="panel__heading"><div><p>Daily throughput</p><h3>Calls &amp; Activity</h3></div><span>Calls · opportunities · memberships · installs</span></div><KpiComparisonChart slide={data.slides.activity} data={data} metricIds={["billableServiceCalls", "opportunities", "membershipsSold", "installs"]} /></section>
    <section className="panel operations-domain__panel"><div className="panel__heading"><div><p>Install economics</p><h3>Install Average Ticket &amp; Revenue</h3></div><span>Validated results only</span></div><KpiComparisonChart slide={data.slides["average-ticket"]} data={data} /></section>
  </main>;
}
