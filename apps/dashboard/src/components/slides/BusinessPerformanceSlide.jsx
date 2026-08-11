import { RevenueChart } from "../RevenueChart";
import { TechnicianMetric } from "../TechnicianMetric";

export function BusinessPerformanceSlide({ data }) {
  return <main className="business-performance dashboard-slide" aria-labelledby="business-performance-title">
    <header className="business-performance__heading">
      <div><p>Today’s business question</p><h2 id="business-performance-title">Where is revenue coming from?</h2></div>
      <span>Technician contribution and validated mix</span>
    </header>
    <section className="panel business-performance__revenue" aria-labelledby="business-revenue-title">
      <div className="panel__heading"><div><p>Revenue contribution</p><h3 id="business-revenue-title">Revenue by Technician</h3></div><span>Highest revenue first</span></div>
      <RevenueChart slide={data.slides.revenue} />
    </section>
    <section className="panel business-performance__conversion" aria-labelledby="business-conversion-title">
      <div className="panel__heading"><div><p>Validated revenue mix</p><h3 id="business-conversion-title">Service &amp; Install</h3></div><span>No estimates</span></div>
      <div className="source-list">{data.slides.revenue.rows.map((row) => <article key={row.technicianId}><strong>{row.shortName || row.name}</strong><TechnicianMetric label="Service" metric={row.metrics.find(({ id }) => id === "serviceRevenue")} /><TechnicianMetric label="Install" metric={row.metrics.find(({ id }) => id === "installRevenue")} /></article>)}</div>
      <p className="source-note">Unavailable classifications stay visibly unavailable instead of being estimated from total revenue.</p>
    </section>
  </main>;
}
