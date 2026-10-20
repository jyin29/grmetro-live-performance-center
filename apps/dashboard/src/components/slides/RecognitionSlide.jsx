import { AnimatedMetric } from "../AnimatedMetric";
import { displayRank, rankedTechnicians } from "../../lib/presentation";

const PERIOD_LABELS = { today: "Today", yesterday: "Yesterday", wtd: "Week to Date", "last-week": "Last Week", mtd: "Month to Date", "last-month": "Last Month", qtd: "Quarter to Date", "last-quarter": "Last Quarter", ytd: "Year to Date", "last-year": "Last Year", "last-7-days": "Last 7 Days", "last-30-days": "Last 30 Days" };

function CrownMark() {
  return <svg className="podium-crown" viewBox="0 0 240 112" aria-hidden="true" focusable="false">
    <path className="podium-crown__face" fill="#FFD700" stroke="#D49419" strokeWidth="2" strokeLinejoin="round" d="M18 30 69 66 120 13l51 53 51-36-15 65H33Z" />
    <path className="podium-crown__base" fill="#D49419" d="M39 84h162l-5 18H44Z" />
    <circle className="podium-crown__jewel" fill="#F5B942" stroke="#D49419" strokeWidth="3" cx="18" cy="28" r="8"/><circle className="podium-crown__jewel" fill="#F5B942" stroke="#D49419" strokeWidth="3" cx="120" cy="12" r="9"/><circle className="podium-crown__jewel" fill="#F5B942" stroke="#D49419" strokeWidth="3" cx="222" cy="28" r="8"/>
  </svg>;
}

function PodiumDecoration({ rank }) {
  if (rank === 1) return <div className="podium-decoration podium-decoration--gold" aria-hidden="true">
    <span className="podium-spark podium-spark--one">✦</span><span className="podium-spark podium-spark--two">✧</span>
    <span className="podium-streamer podium-streamer--left"/><CrownMark/><span className="podium-streamer podium-streamer--right"/>
    <span className="podium-spark podium-spark--three">✦</span><span className="podium-spark podium-spark--four">✧</span>
  </div>;
  return <div className={`podium-decoration podium-decoration--${rank === 2 ? "silver" : "bronze"}`} aria-hidden="true">
    <span className="podium-accent-line"/><span className="podium-accent-spark">✦</span><span className="podium-accent-dot"/>
  </div>;
}

export function RecognitionSlide({ data }) {
  const overallAvailable = data.technicians.some((technician) => technician.overall?.qualifies);
  const podium = rankedTechnicians(data.technicians).filter((technician) => displayRank(technician).rank).slice(0, 3);
  const featured = podium[0];
  const periodLabel = PERIOD_LABELS[data.period] || "Current period";
  if (!featured) return <main className="recognition-slide recognition-slide--empty dashboard-slide" aria-labelledby="recognition-title"><p>Recognition</p><h2 id="recognition-title">Recognition awaiting revenue</h2><span>No validated Revenue Rank is available yet.</span></main>;
  return <main className="recognition-slide dashboard-slide" aria-labelledby="recognition-title">
    <header className="top-three-heading"><p>{overallAvailable ? "Overall standing" : "Revenue Rank fallback"}</p><h2 id="recognition-title">{overallAvailable ? "Top 3 Overall" : "Top 3 Revenue Leaders"}</h2><span>{periodLabel} top performers</span></header>
    <section className="podium" aria-label="Top three technicians">
      {[podium[1], podium[0], podium[2]].filter(Boolean).map((technician) => {
        const shownRank = displayRank(technician);
        return <article className={`podium-card podium-card--${shownRank.rank}${shownRank.rank === 1 ? " podium-card--champion" : ""}`} key={technician.id}>
          <PodiumDecoration rank={shownRank.rank}/>
          <span className="podium-card__place">#{shownRank.rank}</span>
          <span className="recognition-hero__avatar">{technician.initials}</span>
          <h3>{technician.name}</h3>
          <div><span>Revenue</span><AnimatedMetric metric={technician.kpis?.revenue}/></div>
          <div><span>Closing</span><AnimatedMetric metric={technician.kpis?.closingRate}/></div>
        </article>;
      })}
    </section>
  </main>;
}
