import { KpiComparisonChart } from "../KpiComparisonChart";

export function BusinessPerformanceSlide({ data }) {
  return <main className="business-performance dashboard-slide domain-slide" aria-labelledby="business-performance-title">
    <header className="business-performance__heading">
      <div><p>Today</p><h2 id="business-performance-title">Sales</h2></div>
      <span>Closing results and pipeline activity</span>
    </header>
    <section className="panel business-performance__revenue" aria-labelledby="business-revenue-title">
      <div className="panel__heading"><div><p>Primary sales outcome</p><h3 id="business-revenue-title">Closing %</h3></div><span>By technician</span></div>
      <KpiComparisonChart slide={data.slides.performance} data={data} />
    </section>
    <section className="panel business-performance__conversion" aria-labelledby="business-conversion-title">
      <div className="panel__heading"><div><p>Pipeline drivers</p><h3 id="business-conversion-title">Opportunities &amp; Leads</h3></div><span>10+ opportunities · tech leads · marketed leads</span></div>
      <KpiComparisonChart slide={data.slides.activity} data={data} />
    </section>
  </main>;
}
