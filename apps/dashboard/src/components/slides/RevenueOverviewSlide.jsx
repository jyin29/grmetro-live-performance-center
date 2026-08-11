import { RevenueChart } from "../RevenueChart";
import { AnimatedMetric } from "../AnimatedMetric";

export function RevenueOverviewSlide({ data }) {
  const revenue = data.slides.revenue;
  return <main className="question-slide dashboard-slide" aria-labelledby="pace-title">
    <header className="question-slide__heading"><div><p>Tier 1 · Today</p><h2 id="pace-title">Revenue</h2></div><span>Daily production by technician</span></header>
    <section className="panel pace-panel">
      <div className="panel__heading"><div><p>Revenue vs. goal</p><h3>Daily Revenue Progress</h3></div><span>Largest emphasis</span></div>
      <div className="pace-list">
        {revenue.rows.map((row) => {
          const metric = row.metrics.find(({ id }) => id === "revenue");
          return <article className="pace-row" key={row.technicianId}>
            <span className="pace-row__rank">#{metric.rank}</span><strong>{row.shortName || row.name}</strong>
            <div className="pace-row__track"><i style={{ width: `${Math.min(100, metric.percentComplete || 0)}%` }} /></div>
            <div className="pace-row__value"><AnimatedMetric metric={metric} /><small>of <AnimatedMetric metric={{ ...metric, value: metric.goal, hasData: metric.goal !== null }} /></small></div>
            <b className={metric.reached ? "is-on-pace" : ""}>{metric.hasData && metric.percentComplete !== null ? `${Math.round(metric.percentComplete)}%` : "No data"}</b>
          </article>;
        })}
      </div>
    </section>
    <section className="panel pace-context" aria-label="Revenue comparison context">
      <div className="panel__heading"><div><p>Team distribution</p><h3>Revenue by Technician</h3></div></div>
      <RevenueChart slide={data.slides.revenue} />
    </section>
  </main>;
}
