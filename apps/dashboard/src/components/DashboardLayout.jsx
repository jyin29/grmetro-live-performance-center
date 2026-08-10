import { Header } from "./Header";
import { KpiCard } from "./KpiCard";
import { Leaderboard } from "./Leaderboard";
import { summaryMetrics } from "../lib/presentation";

export function DashboardLayout({ data, error, refreshing }) {
  return <div className="app-shell">
    <Header refreshedAt={data.refreshedAt} refreshing={refreshing} hasError={Boolean(error)} />
    {error && <div className="inline-warning">Live updates are temporarily interrupted. Showing the last successful update.</div>}
    <main className="dashboard-grid">
      <section className="summary-grid" aria-label="KPI summary">{summaryMetrics(data).map((item) => <KpiCard key={item.id} item={item} />)}</section>
      <section className="panel main-content">
        <div className="panel__heading"><div><p>Today’s performance</p><h2>Team KPI Overview</h2></div><span>Live data</span></div>
        <div className="future-placeholder"><div className="future-placeholder__bars"><i /><i /><i /><i /><i /></div><div><strong>Chart experience coming next</strong><p>This reserved content area will host backend-prepared KPI visualizations. TV rotation, remote control, and AI insights remain intentionally unimplemented.</p></div></div>
      </section>
      <Leaderboard technicians={data.technicians} />
    </main>
    <footer className="footer"><span><i className="live-dot" />Live ServiceTitan data</span><span>Dashboard foundation · REST connected</span><time>{new Date(data.generatedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</time></footer>
  </div>;
}
