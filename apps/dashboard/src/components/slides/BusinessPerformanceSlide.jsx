import { KpiComparisonChart } from "../KpiComparisonChart";
import { RevenueChart } from "../RevenueChart";

export function BusinessPerformanceSlide({ data }) {
  return <main className="business-performance dashboard-slide" aria-labelledby="business-performance-title">
    <header className="business-performance__heading">
      <div><p>Today at a glance</p><h2 id="business-performance-title">Business Performance</h2></div>
      <span>Revenue and conversion</span>
    </header>
    <section className="panel business-performance__revenue" aria-labelledby="business-revenue-title">
      <div className="panel__heading"><div><p>Revenue breakdown</p><h3 id="business-revenue-title">Revenue by Technician</h3></div><span>Team comparison</span></div>
      <RevenueChart slide={data.slides.revenue} />
    </section>
    <section className="panel business-performance__conversion" aria-labelledby="business-conversion-title">
      <div className="panel__heading"><div><p>Conversion health</p><h3 id="business-conversion-title">Closing Performance</h3></div><span>0–100%</span></div>
      <KpiComparisonChart slide={data.slides.performance} />
    </section>
  </main>;
}
