import { rankedTechnicians } from "../lib/presentation";

export function TechnicianRankingChart({ technicians }) {
  const ranked = rankedTechnicians(technicians);
  return <ol className="ranking-chart" aria-label="Technician ranking chart">
    {ranked.map((technician) => {
      const qualified = technician.overall?.qualifies;
      const rank = technician.overall?.rank;
      const width = qualified ? `${Math.max(22, 100 - ((rank - 1) * 13))}%` : "12%";
      return <li key={technician.id}>
        <span className="ranking-chart__rank">{qualified ? `#${rank}` : "—"}</span>
        <span className="ranking-chart__avatar">{technician.initials}</span>
        <span className="ranking-chart__person"><strong>{technician.name}</strong><i><span style={{ width }} /></i></span>
        <span className={`ranking-chart__change ${technician.overall?.rankChange > 0 ? "is-up" : ""}`}>{technician.overall?.rankChange > 0 ? `↑${technician.overall.rankChange}` : technician.overall?.rankChange < 0 ? `↓${Math.abs(technician.overall.rankChange)}` : "—"}</span>
      </li>;
    })}
  </ol>;
}

