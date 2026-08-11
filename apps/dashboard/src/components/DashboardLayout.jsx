import { Header } from "./Header";
import { KpiCard } from "./KpiCard";
import { KpiComparisonChart } from "./KpiComparisonChart";
import { RevenueChart } from "./RevenueChart";
import { TechnicianRankingChart } from "./TechnicianRankingChart";
import { summaryMetrics } from "../lib/presentation";

export function DashboardLayout({ data, error, refreshing }) {
  return <div className="app-shell">
    <Header refreshedAt={data.refreshedAt} refreshing={refreshing} hasError={Boolean(error)} />
    {error && <div className="inline-warning">Live updates are temporarily interrupted. Showing the last successful update.</div>}
    <main className="dashboard-grid">
      <section className="summary-grid" aria-label="KPI summary">{summaryMetrics(data).map((item) => <KpiCard key={item.id} item={item} />)}</section>
      <section className="panel main-content" aria-labelledby="revenue-title">
        <div className="panel__heading"><div><p>Today’s performance</p><h2 id="revenue-title">Revenue</h2></div><span>Team comparison</span></div>
        <RevenueChart slide={data.slides.revenue} />
      </section>
      <aside className="panel leaderboard" aria-labelledby="leaderboard-title">
        <div className="panel__heading"><div><p>Team standings</p><h2 id="leaderboard-title">Technician Leaderboard</h2></div><span>Overall</span></div>
        <TechnicianRankingChart technicians={data.technicians} />
      </aside>
      <section className="panel comparison-panel" aria-labelledby="comparison-title">
        <div className="panel__heading"><div><p>Conversion health</p><h2 id="comparison-title">KPI Comparison</h2></div><span>0–100%</span></div>
        <KpiComparisonChart slide={data.slides.performance} />
      </section>
    </main>
    <footer className="footer"><span><i className="live-dot" />Live ServiceTitan data</span><span>Production dashboard · REST connected</span><time>{new Date(data.generatedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</time></footer>
  </div>;
}
