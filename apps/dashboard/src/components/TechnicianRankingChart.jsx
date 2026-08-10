import { ChartPanel } from "./ChartPanel";

export function TechnicianRankingChart({ technicians }) {
  const qualified = technicians.filter((technician) => technician.overall?.qualifies && technician.overall.rank);
  return <ChartPanel eyebrow="Overall score" title="Technician ranking" meta="Backend order" className="ranking-chart">
    <div className="ranking-bars">{qualified.map((technician) => <div className="ranking-bar-row" key={technician.id}>
      <span>#{technician.overall.rank}</span><strong>{technician.shortName}</strong><svg viewBox="0 0 100 18" role="img" aria-label={`${technician.shortName}, overall rank ${technician.overall.rank}`} preserveAspectRatio="none"><rect width="100" height="18" rx="9" className="ranking-track"/><rect width={Math.max(18, ((qualified.length - technician.overall.rank + 1) / qualified.length) * 100)} height="18" rx="9" className="ranking-fill"/></svg><small>{technician.overall.rankChange > 0 ? `↑${technician.overall.rankChange}` : technician.overall.rankChange < 0 ? `↓${Math.abs(technician.overall.rankChange)}` : "—"}</small>
    </div>)}</div>
  </ChartPanel>;
}
