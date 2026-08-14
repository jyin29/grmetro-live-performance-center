import { TechnicianPerformanceCard } from "../TechnicianPerformanceCard";
import { rankedTechnicians } from "../../lib/presentation";
import "../../technician-performance-tv.css";

export function TechnicianPerformanceSlide({ data }) {
  const periodLabel = data.period === "mtd" ? "Month to Date" : "Today";
  return <main className="technician-performance dashboard-slide" aria-labelledby="technician-performance-title">
    <div className="technician-performance__heading">
      <div>
        <p>{periodLabel} by person</p>
        <h2 id="technician-performance-title">Technicians</h2>
      </div>
      <span>Overall rank · Revenue · Closing · Best available field activity</span>
    </div>
    <section className="technician-performance__grid" aria-label="Technician performance cards">
      {rankedTechnicians(data.technicians).map((technician) => <TechnicianPerformanceCard key={technician.id} technician={technician} data={data} />)}
    </section>
  </main>;
}
