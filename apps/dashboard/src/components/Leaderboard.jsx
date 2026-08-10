import { rankedTechnicians } from "../lib/presentation";
import { TechnicianCard } from "./TechnicianCard";

export function Leaderboard({ technicians }) {
  return <aside className="panel leaderboard" aria-labelledby="leaderboard-title">
    <div className="panel__heading"><div><p>Team standings</p><h2 id="leaderboard-title">Technician Leaderboard</h2></div><span>Overall</span></div>
    <ol>{rankedTechnicians(technicians).map((technician) => <TechnicianCard key={technician.id} technician={technician} />)}</ol>
  </aside>;
}
