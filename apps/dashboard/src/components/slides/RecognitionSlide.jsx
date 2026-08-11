import { AnimatedMetric } from "../AnimatedMetric";
import { RecognitionCard } from "../RecognitionCard";
import { recognitionPresentation } from "../../lib/presentation";

export function RecognitionSlide({ data }) {
  const { featured, recognitions } = recognitionPresentation(data.technicians);

  if (!featured) {
    return <main className="recognition-slide recognition-slide--empty dashboard-slide" aria-labelledby="recognition-title">
      <p>Today’s recognition</p>
      <h2 id="recognition-title">Top performer coming soon</h2>
      <span>Waiting for a backend-prepared overall ranking.</span>
    </main>;
  }

  return <main className="recognition-slide dashboard-slide" aria-labelledby="recognition-title">
    <section className="recognition-hero">
      <p className="recognition-hero__eyebrow" id="recognition-title"><span aria-hidden="true">🏆</span> Today’s Top Performer</p>
      <div className="recognition-hero__identity">
        <span className="recognition-hero__avatar" aria-hidden="true">{featured.initials}</span>
        <h2>{featured.name}</h2>
      </div>
      <div className="recognition-hero__metrics" aria-label={`${featured.name} featured metrics`}>
        <div><span>Revenue</span><AnimatedMetric metric={featured.kpis?.revenue} /></div>
        <div><span>Closing</span><AnimatedMetric metric={featured.kpis?.closingRate} /></div>
        <div className="recognition-hero__rank"><span>Overall Rank</span><strong>#<AnimatedMetric metric={{ value: featured.overall.rank, hasData: true, format: "integer" }} /></strong></div>
      </div>
    </section>
    {recognitions.length > 0 && <section className="recognition-list" aria-label="Additional recognition">
      {recognitions.map((recognition) => <RecognitionCard key={recognition.id} recognition={recognition} />)}
    </section>}
  </main>;
}
