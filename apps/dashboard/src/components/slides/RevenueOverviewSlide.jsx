import { AnimatedMetric } from "../AnimatedMetric";
import { ComparisonValue } from "../ComparisonValue";
import { TrendIndicator } from "../TrendIndicator";
import { metricHistory } from "../../lib/historicalPresentation";

export function RevenueOverviewSlide({ data }) {
  const revenue = data.slides.revenue;
  return <main className="question-slide dashboard-slide" aria-labelledby="pace-title">
    <header className="question-slide__heading"><div><p>Today</p><h2 id="pace-title">Revenue</h2></div><span>Daily production by technician</span></header>
    <section className="panel pace-panel">
      <div className="panel__heading revenue-table-heading"><div><p>Today by technician</p><h3>Revenue &amp; Goal Progress</h3></div><div className="revenue-table-columns" aria-hidden="true"><span>Today</span><span>Goal</span><span>Remaining</span><span>Goal %</span></div></div>
      <div className="pace-list">
        {revenue.rows.map((row) => {
          const metric = row.metrics.find(({ id }) => id === "revenue");
          const history = metricHistory(data, row.technicianId, "revenue");
          return <article className="pace-row" key={row.technicianId}>
            <span className="pace-row__rank">#{metric.rank}</span><strong>{row.shortName || row.name}</strong>
            <div className="pace-row__track" aria-label="Revenue distribution"><i style={{ width: `${Math.min(100, (metric.normalizedRatio || 0) * 100)}%` }} /></div>
            <div className="pace-row__value"><AnimatedMetric metric={metric} /><ComparisonValue comparison={history.comparison?.value} format={metric.format} /></div>
            <div className="pace-row__support"><AnimatedMetric metric={{ ...metric, value: metric.goal, hasData: metric.goal !== null }} /></div>
            <div className="pace-row__support"><AnimatedMetric metric={{ ...metric, value: metric.remaining, hasData: metric.remaining !== null }} /></div>
            <b className={metric.reached ? "is-on-pace" : ""}>{metric.hasData && metric.percentComplete !== null ? `${Math.round(metric.percentComplete)}%` : "No data"}<TrendIndicator trend={history.trends?.goalProgress} streakNoun="improvements" /></b>
          </article>;
        })}
      </div>
    </section>
  </main>;
}
