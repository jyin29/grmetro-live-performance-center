import { formatComparison, trendPresentation } from "../lib/historicalPresentation";
import { formatMetric, refreshLabel } from "../lib/presentation";
import { technicianDetailModel } from "../lib/technicianDetail";

function MetricCard({ item }) {
  const { metric, comparison, trend } = item;
  const valueTrend = trendPresentation(trend?.value);
  const comparisonText = formatComparison(comparison?.value, metric?.format);
  return <article className="technician-detail__metric">
    <p>{item.label}</p><strong>{formatMetric(metric)}</strong>
    {metric?.goal !== undefined && metric.goal !== null && <dl>
      <div><dt>Goal</dt><dd>{formatMetric({ ...metric, value: metric.goal, hasData: true })}</dd></div>
      <div><dt>Remaining</dt><dd>{metric.remaining === null ? "No data" : formatMetric({ ...metric, value: metric.remaining, hasData: true })}</dd></div>
      <div><dt>Goal Progress</dt><dd>{Number.isFinite(metric.percentComplete) ? `${Math.round(metric.percentComplete)}%` : "No data"}</dd></div>
    </dl>}
    <div className="technician-detail__context">
      <span className={`is-${valueTrend.tone}`}>{valueTrend.symbol} {valueTrend.label}</span>
      <span>{comparisonText ? `${comparisonText} vs previous refresh` : "No historical comparison"}</span>
    </div>
    <small className={`quality-${metric?.dataQuality || "unavailable"}`}>Data quality: {metric?.dataQuality || "unavailable"}</small>
  </article>;
}

function EventList({ title, items, empty }) {
  return <section className="technician-detail__list"><h3>{title}</h3>{items.length
    ? <ul>{items.map((item) => <li key={item.id || `${item.ruleId}-${item.createdAt}`}><b>{item.title || item.type}</b>{item.detail && <span>{item.detail}</span>}<small>{item.eyebrow || item.priority}</small></li>)}</ul>
    : <p>{empty}</p>}</section>;
}

export function TechnicianDetail({ data, selectedId }) {
  const model = technicianDetailModel(data, selectedId);
  if (!model) return <section className="technician-detail technician-detail--empty"><h2>Technician Detail</h2><p>No technician data is currently available.</p></section>;
  const { technician } = model;
  const overallTrend = trendPresentation(model.trends?.overallRanking);
  const overallComparison = formatComparison(model.comparison?.overallRanking, "integer", "rank");
  return <section className="technician-detail" aria-labelledby="technician-detail-title">
    <header><div><p>Technician Detail</p><h2 id="technician-detail-title">{technician.name}</h2></div><div className="technician-detail__refresh"><span>Refresh time</span><strong>{refreshLabel(model.refreshedAt)}</strong></div></header>
    <div className="technician-detail__groups">
      {model.groups.map((group) => <section key={group.id} className={`technician-detail__group is-${group.id}`}><h3>{group.label}</h3><div>{group.metrics.map((item) => <MetricCard key={item.id} item={item} />)}</div></section>)}
      <section className="technician-detail__group is-recognition"><h3>Recognition</h3><div>
        <article className="technician-detail__metric"><p>Overall Rank</p><strong>{technician.overall?.qualifies && technician.overall.rank ? `#${technician.overall.rank}` : "No data"}</strong><div className="technician-detail__context"><span className={`is-${overallTrend.tone}`}>{overallTrend.symbol} {overallTrend.label}</span><span>{overallComparison || "No historical comparison"}</span></div></article>
        <article className="technician-detail__metric"><p>Rank Movement</p><strong>{Number.isFinite(technician.overall?.rankChange) ? `${technician.overall.rankChange > 0 ? "+" : ""}${technician.overall.rankChange}` : "No data"}</strong><small>Backend-prepared movement</small></article>
      </div></section>
      <section className="technician-detail__group is-history"><h3>History</h3><div className="technician-detail__history">
        <article><p>Historical Comparison</p><strong>{model.comparison?.available ? "Available" : "Not available"}</strong><small>{model.comparison?.reason || "Compared with the previous successful refresh"}</small></article>
        <article><p>Historical Trend</p><strong>{model.trends?.available ? "Available" : "Not available"}</strong><small>{model.trends?.reason || `${model.trends.snapshotCount || "Multiple"} snapshots analyzed`}</small></article>
      </div></section>
      <section className="technician-detail__activity"><EventList title="Achievements & Recent Events" items={model.events} empty="No recent events for this technician." /><EventList title="Current Alerts & Management Insights" items={model.insights} empty="No current management alerts." /></section>
    </div>
  </section>;
}
