import { TechnicianPerformanceCard } from "../TechnicianPerformanceCard";
import { rankedTechnicians } from "../../lib/presentation";
import { reportingPeriod } from "../../lib/reportingPeriod";
import "../../technician-performance-tv.css";

export function TechnicianPerformanceSlide({ data, metricVisibility }) {
  const period = reportingPeriod(data);
  const technicians = rankedTechnicians(data.technicians);
  return <main className="technician-performance dashboard-slide" aria-labelledby="technician-performance-title">
    <div className="technician-performance__heading">
      <div><p>{period.label} by person</p><h2 id="technician-performance-title">Technicians</h2></div>
      <span>Overall rank · {period.dateRangeLabel}</span>
    </div>
    <section className="technician-performance__grid" aria-label="Technician performance cards" style={{ "--technician-card-count": technicians.length }}>
      {technicians.map((technician) => <TechnicianPerformanceCard key={technician.id} technician={technician} data={data} metricVisibility={metricVisibility} />)}
    </section>
  </main>;
}
