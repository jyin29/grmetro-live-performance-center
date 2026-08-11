import { rankedTechnicians } from "../lib/presentation";
import { AnimatedMetric } from "./AnimatedMetric";
import { useChangeHighlight } from "../hooks/useChangeHighlight";

function RankingRow({ technician }) {
  const qualified = technician.overall?.qualifies;
  const rank = technician.overall?.rank;
  const width = qualified ? `${Math.max(22, 100 - ((rank - 1) * 13))}%` : "12%";
  const highlighted = useChangeHighlight(`${rank}:${technician.overall?.rankChange}`);
  return <li className={highlighted ? "is-updated" : ""}>
    <span className="ranking-chart__rank">{qualified ? <>#<AnimatedMetric metric={{ value: rank, hasData: true, format: "integer" }} /></> : "—"}</span>
    <span className="ranking-chart__avatar">{technician.initials}</span>
    <span className="ranking-chart__person"><strong>{technician.name}</strong><i><span style={{ width }} /></i></span>
    <span className={`ranking-chart__change ${technician.overall?.rankChange > 0 ? "is-up" : ""}`}>{technician.overall?.rankChange > 0 ? `↑${technician.overall.rankChange}` : technician.overall?.rankChange < 0 ? `↓${Math.abs(technician.overall.rankChange)}` : "—"}</span>
  </li>;
}

export function TechnicianRankingChart({ technicians }) {
  const ranked = rankedTechnicians(technicians);
  return <ol className="ranking-chart" aria-label="Technician ranking chart">
    {ranked.map((technician) => <RankingRow key={technician.id} technician={technician} />)}
  </ol>;
}
