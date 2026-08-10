export function TechnicianCard({ technician, compact = false }) {
  const qualified = technician.overall?.qualifies;
  return <li className={`technician-card${compact ? " technician-card--compact" : ""}`} tabIndex="0">
    <span className="technician-card__rank">{qualified ? `#${technician.overall.rank}` : "—"}</span>
    <span className="technician-card__avatar">{technician.initials}</span>
    <span className="technician-card__name"><strong>{technician.name}</strong><small>{qualified ? "Overall leaderboard" : "Awaiting qualifying data"}</small></span>
    <span className="technician-card__trend">{technician.overall?.rankChange > 0 ? `↑ ${technician.overall.rankChange}` : technician.overall?.rankChange < 0 ? `↓ ${Math.abs(technician.overall.rankChange)}` : "—"}</span>
  </li>;
}
