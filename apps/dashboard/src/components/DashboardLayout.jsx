import { Header } from "./Header";
import { KpiCard } from "./KpiCard";
import { Leaderboard } from "./Leaderboard";
import { PerformerGroup } from "./PerformerGroup";
import { RevenueTrendChart } from "./RevenueTrendChart";
import { KpiComparisonChart } from "./KpiComparisonChart";
import { TechnicianRankingChart } from "./TechnicianRankingChart";
import { TechnicianSummaryCard } from "./TechnicianSummaryCard";
import { dashboardStatus, performerGroups, rankedTechnicians, summaryMetrics } from "../lib/presentation";

export function DashboardLayout({ data, error, refreshing }) {
  const technicians = rankedTechnicians(data.technicians);
  const performers = performerGroups(technicians);
  const status = dashboardStatus(data.status, { refreshing, requestFailed: Boolean(error) });

  return <div className="app-shell">
    <Header refreshedAt={data.refreshedAt} refreshing={refreshing} hasError={Boolean(error)} backendStatus={data.status} />
    {error && <div className="inline-warning" role="status">Live updates are temporarily interrupted. Showing the last successful update.</div>}
    <main className="dashboard">
      <section className="summary-grid" aria-label="KPI cards">{summaryMetrics(data).map((item) => <KpiCard key={item.id} item={item} />)}</section>
      <section className="visualization-grid" aria-label="Performance visualizations">
        <RevenueTrendChart technicians={technicians} />
        <KpiComparisonChart slide={data.slides.performance} />
        <TechnicianRankingChart technicians={technicians} />
      </section>
      <section className="performance-grid" aria-label="Technician performance summaries">
        <Leaderboard technicians={technicians} />
        <div className="performer-stack">
          <PerformerGroup title="Top performers" eyebrow="Leading today" technicians={performers.top} tone="top" />
          <PerformerGroup title="Bottom performers" eyebrow="Opportunity area" technicians={performers.bottom} tone="bottom" />
        </div>
      </section>
      <section className="technician-summaries" aria-labelledby="summary-title">
        <div className="section-heading"><div><p>Team detail</p><h2 id="summary-title">Technician summaries</h2></div><span>Backend-ranked</span></div>
        <div className="technician-summary-grid">{technicians.map((technician) => <TechnicianSummaryCard key={technician.id} technician={technician} />)}</div>
      </section>
    </main>
    <footer className="footer"><span><i className={`live-dot live-dot--${status.tone}`} />{status.label}</span><span>Live ServiceTitan dashboard</span><time>{new Date(data.generatedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</time></footer>
  </div>;
}
