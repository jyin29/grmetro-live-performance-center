import { rankedTechnicians, freshness } from "../../lib/presentation";
import { TechnicianMetric } from "../TechnicianMetric";

export function OperationsHealthSlide({ data, presentationState }) {
  const ranked = rankedTechnicians(data.technicians);
  const attention = ranked.slice(-2).reverse();
  const unavailable = ["billableServiceCalls", "serviceRevenue", "leadConversionRate", "installs", "installAverageTicket", "installRevenue"].filter((id) => data.technicians.every((technician) => !technician.kpis?.[id]?.hasData));
  const healthy = !presentationState.hasError && freshness(data.refreshedAt) === "live";

  return <main className="operations-health dashboard-slide" aria-labelledby="operations-health-title">
    <header className="attention-heading"><div><p>Today’s business question</p><h2 id="operations-health-title">What needs attention?</h2></div><span className={healthy ? "is-healthy" : "is-warning"}>{healthy ? "Live data healthy" : "Data feed needs attention"}</span></header>
    <section className="attention-grid">{attention.map((technician) => <article className="attention-card" key={technician.id}><header><span>Overall rank #{technician.overall.rank}</span><h3>{technician.name}</h3></header><TechnicianMetric label="Revenue" metric={technician.kpis.revenue} /><TechnicianMetric label="Goal remaining" metric={{ ...technician.kpis.revenue, value: technician.kpis.revenue.remaining, hasData: technician.kpis.revenue.remaining !== null }} /><TechnicianMetric label="Closing" metric={technician.kpis.closingRate} /></article>)}</section>
    <aside className="data-watch"><div><p>Data watch</p><strong>{unavailable.length ? `${unavailable.length} KPI mappings unavailable` : "All displayed KPI mappings available"}</strong></div><span>{unavailable.length ? "Unvalidated service/install metrics are withheld—not guessed." : "No mapping gaps detected in this payload."}</span></aside>
  </main>;
}
