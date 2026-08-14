import { AnimatedMetric } from "../AnimatedMetric";
import { ComparisonValue } from "../ComparisonValue";
import { TrendIndicator } from "../TrendIndicator";
import { metricHistory } from "../../lib/historicalPresentation";

export function RevenueOverviewSlide({ data }) {
  const revenue = data.slides.revenue;
  const periodLabel = data.period === "mtd" ? "Month to Date" : "Today";
  const periodShortLabel = data.period === "mtd" ? "MTD" : "Today";
  const revenueMetrics = revenue.rows.map((row) => row.metrics.find(({ id }) => id === "revenue"));
  const leadingRevenue = Math.max(0, ...revenueMetrics.filter((metric) => metric?.hasData).map((metric) => metric.value || 0));
  const revenueBarWidth = (metric) => {
    if (!metric?.hasData || !(metric.value > 0)) return 0;
    // A configured positive goal is the authoritative scale: reaching the goal fills the track.
    // Without a goal, keep the leader at 80% and scale everyone else proportionally to the leader.
    if (Number(metric.goal) > 0) return Math.min(100, (metric.value / metric.goal) * 100);
    if (!(leadingRevenue > 0)) return 0;
    return Math.min(80, (metric.value / leadingRevenue) * 80);
  };
  return <main className="question-slide dashboard-slide" aria-labelledby="pace-title">
    <header className="question-slide__heading"><div><p>{periodLabel}</p><h2 id="pace-title">Revenue</h2></div><span>{periodLabel} production by technician</span></header>
    <section className="panel pace-panel">
      <div className="panel__heading revenue-table-heading"><div><p>{periodLabel} by technician</p><h3>Revenue &amp; Goal Progress</h3></div><div className="revenue-table-columns" aria-hidden="true"><span>{periodShortLabel}</span><span>Goal</span><span>Remaining</span><span>Goal %</span></div></div>
      <div className="pace-list">
        {revenue.rows.map((row) => {
          const metric = row.metrics.find(({ id }) => id === "revenue");
          const history = metricHistory(data, row.technicianId, "revenue");
          return <article className="pace-row" key={row.technicianId}>
            <span className="pace-row__rank">#{metric.rank}</span><strong>{row.shortName || row.name}</strong>
            <div className="pace-row__track" aria-label="Revenue progress toward goal, or relative revenue when no goal is configured"><i style={{ width: `${revenueBarWidth(metric)}%` }} /></div>
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
