import { TechnicianCard } from "./TechnicianCard";

export function PerformerGroup({ title, eyebrow, technicians, tone }) {
  return <section className={`panel performer-group performer-group--${tone}`} tabIndex="0" aria-label={title}>
    <div className="compact-heading"><div><p>{eyebrow}</p><h2>{title}</h2></div></div>
    <ol>{technicians.map((technician) => <TechnicianCard key={technician.id} technician={technician} compact />)}</ol>
  </section>;
}
