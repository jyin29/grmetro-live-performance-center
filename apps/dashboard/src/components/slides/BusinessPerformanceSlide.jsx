import { KpiComparisonChart } from "../KpiComparisonChart";

export function BusinessPerformanceSlide({ data }) {
  return <main className="business-performance dashboard-slide domain-slide" aria-labelledby="business-performance-title">
    <header className="business-performance__heading">
      <div><p>Tier 1 + Tier 2</p><h2 id="business-performance-title">Sales</h2></div>
      <span>Conversion and opportunity pipeline</span>
    </header>
    <section className="panel business-performance__revenue" aria-labelledby="business-revenue-title">
      <div className="panel__heading"><div><p>Tier 1 outcome</p><h3 id="business-revenue-title">Closing Performance</h3></div><span>Confirmed values only</span></div>
      <KpiComparisonChart slide={data.slides.performance} data={data} />
    </section>
    <section className="panel business-performance__conversion" aria-labelledby="business-conversion-title">
      <div className="panel__heading"><div><p>Tier 2 drivers</p><h3 id="business-conversion-title">Sales Activity</h3></div><span>Opportunities and leads</span></div>
      <KpiComparisonChart slide={data.slides.activity} data={data} />
    </section>
  </main>;
}
