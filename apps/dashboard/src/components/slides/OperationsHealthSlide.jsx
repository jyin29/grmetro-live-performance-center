import { useEffect, useState } from "react";
import { operationsHealthPresentation } from "../../lib/presentation";

export function OperationsHealthSlide({ data, presentationState }) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(interval);
  }, []);

  const health = operationsHealthPresentation(data, presentationState, now);

  return <main className="operations-health dashboard-slide" aria-labelledby="operations-health-title">
    <section className={`operations-health__hero operations-health__hero--${health.overall.tone}`}>
      <span className="operations-health__signal" aria-hidden="true">{health.overall.tone === "healthy" ? "✓" : "!"}</span>
      <div>
        <p>Operations Health</p>
        <h2 id="operations-health-title">{health.overall.label}</h2>
        <span>{health.overall.detail}</span>
      </div>
    </section>
    <section className="operations-health__grid" aria-label="Dashboard health details">
      {health.cards.map((card) => <article className={`health-card health-card--${card.tone}`} key={card.id}>
        <p>{card.label}</p>
        <strong>{card.value}</strong>
        <span>{card.detail}</span>
      </article>)}
    </section>
  </main>;
}
