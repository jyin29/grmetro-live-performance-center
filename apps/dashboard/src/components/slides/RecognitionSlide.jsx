import { AnimatedMetric } from "../AnimatedMetric";
import { rankedTechnicians } from "../../lib/presentation";

export function RecognitionSlide({ data }) {
  const podium = rankedTechnicians(data.technicians).filter((technician) => technician.overall?.qualifies).slice(0, 3);
  const featured = podium[0];

  if (!featured) {
    return <main className="recognition-slide recognition-slide--empty dashboard-slide" aria-labelledby="recognition-title">
      <p>Recognition</p>
      <h2 id="recognition-title">Top 3 coming soon</h2>
      <span>Waiting for a backend-prepared overall ranking.</span>
    </main>;
  }

  return <main className="recognition-slide dashboard-slide" aria-labelledby="recognition-title">
    <header className="top-three-heading"><p>Overall standing</p><h2 id="recognition-title">Top 3</h2><span>Today’s top performers</span></header>
    <section className="podium" aria-label="Top three technicians">{[podium[1], podium[0], podium[2]].filter(Boolean).map((technician) => <article className={`podium-card podium-card--${technician.overall.rank}`} key={technician.id}>
      <span className="podium-card__place">#{technician.overall.rank}</span><span className="recognition-hero__avatar">{technician.initials}</span><h3>{technician.name}</h3>
      <div><span>Revenue</span><AnimatedMetric metric={technician.kpis?.revenue} /></div><div><span>Closing</span><AnimatedMetric metric={technician.kpis?.closingRate} /></div>
    </article>)}</section>
  </main>;
}
