import { AnimatedMetric } from "../AnimatedMetric";
import { displayRank, rankedTechnicians } from "../../lib/presentation";

const PERIOD_LABELS = { today: "Today", yesterday: "Yesterday", wtd: "Week to Date", "last-week": "Last Week", mtd: "Month to Date", "last-month": "Last Month", qtd: "Quarter to Date", "last-quarter": "Last Quarter", ytd: "Year to Date", "last-year": "Last Year", "last-7-days": "Last 7 Days", "last-30-days": "Last 30 Days" };

function CrownMark() {
  return <svg className="podium-crown" viewBox="0 0 240 112" aria-hidden="true" focusable="false">
    <path className="podium-crown__face" fill="#D8AE48" stroke="#9A6815" strokeWidth="2" strokeLinejoin="round" d="M20 34 67 66 116 19Q120 15 124 19l49 47 47-32-15 58Q120 104 35 92Z" />
    <path className="podium-crown__shadow" fill="#B67D1C" d="M35 82q85 17 170 0l-2 13q-83 13-166 0Z" />
    <path className="podium-crown__highlight" fill="none" stroke="#F1D68A" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" d="m34 39 32 22 48-45" />
    <path className="podium-crown__base" fill="#B78224" d="M39 86h162l-5 17H44Z" />
    <path className="podium-crown__base-highlight" fill="#E2BE63" d="M43 86h154l-1 5H44Z" />
    <circle className="podium-crown__jewel" fill="#DDBB62" stroke="#9A6815" strokeWidth="3" cx="20" cy="32" r="7"/><circle className="podium-crown__jewel" fill="#DDBB62" stroke="#9A6815" strokeWidth="3" cx="120" cy="16" r="8"/><circle className="podium-crown__jewel" fill="#DDBB62" stroke="#9A6815" strokeWidth="3" cx="220" cy="32" r="7"/>
  </svg>;
}

function ChampionFlourish() {
  return <svg className="podium-flourish" viewBox="0 0 430 116" aria-hidden="true" focusable="false">
    <path className="podium-flourish__curve" fill="none" stroke="#B98A2E" strokeWidth="3" strokeLinecap="round" d="M92 101C57 94 43 70 53 46c6-14 18-24 34-29" />
    <path className="podium-flourish__curve" fill="none" stroke="#B98A2E" strokeWidth="3" strokeLinecap="round" d="M338 101c35-7 49-31 39-55-6-14-18-24-34-29" />
    <path className="podium-flourish__highlight" fill="none" stroke="#E4C76E" strokeWidth="1.5" strokeLinecap="round" d="M86 94C61 86 52 68 59 50M344 94c25-8 34-26 27-44" />
    <path className="podium-flourish__star" fill="#D6B254" d="m58 18 2.5 6.5L67 27l-6.5 2.5L58 36l-2.5-6.5L49 27l6.5-2.5Z" />
    <path className="podium-flourish__star" fill="#E2C56B" d="m89 41 1.6 4.4L95 47l-4.4 1.6L89 53l-1.6-4.4L83 47l4.4-1.6Z" />
    <path className="podium-flourish__star" fill="#E2C56B" d="m341 41 1.6 4.4L347 47l-4.4 1.6L341 53l-1.6-4.4L335 47l4.4-1.6Z" />
    <path className="podium-flourish__star" fill="#D6B254" d="m372 18 2.5 6.5L381 27l-6.5 2.5L372 36l-2.5-6.5L363 27l6.5-2.5Z" />
  </svg>;
}

function PodiumDecoration({ rank }) {
  if (rank === 1) return <div className="podium-decoration podium-decoration--gold" aria-hidden="true">
    <ChampionFlourish/>
    <CrownMark/>
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
