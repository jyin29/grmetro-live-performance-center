import { AnimatedMetric } from "../AnimatedMetric";
import { displayRank, rankedTechnicians } from "../../lib/presentation";

export function RecognitionSlide({ data }) {
  const overallAvailable = data.technicians.some((technician) => technician.overall?.qualifies);
  const podium = rankedTechnicians(data.technicians).filter((technician) => displayRank(technician).rank).slice(0, 3);
  const featured = podium[0];
  const periodLabel = data.period === "mtd" ? "Month to Date" : "Today";

  if (!featured) {
    return <main className="recognition-slide recognition-slide--empty dashboard-slide" aria-labelledby="recognition-title">
      <p>Recognition</p>
      <h2 id="recognition-title">Recognition awaiting revenue</h2>
      <span>No validated Revenue Rank is available yet.</span>
    </main>;
  }

  return <main className="recognition-slide dashboard-slide" aria-labelledby="recognition-title">
    <header className="top-three-heading"><p>{overallAvailable ? "Overall standing" : "Revenue Rank fallback"}</p><h2 id="recognition-title">{overallAvailable ? "Top 3 Overall" : "Top 3 Revenue Leaders"}</h2><span>{periodLabel} top performers</span></header>
    <section className="podium" aria-label="Top three technicians">{[podium[1], podium[0], podium[2]].filter(Boolean).map((technician) => { const shownRank = displayRank(technician); return <article className={`podium-card podium-card--${shownRank.rank}`} key={technician.id}>
      <span className="podium-card__place">#{shownRank.rank}</span><span className="recognition-hero__avatar">{technician.initials}</span><h3>{technician.name}</h3>
      <div><span>Revenue</span><AnimatedMetric metric={technician.kpis?.revenue} /></div><div><span>Closing</span><AnimatedMetric metric={technician.kpis?.closingRate} /></div>
    </article>; })}</section>
  </main>;
}
