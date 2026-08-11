import { TechnicianPerformanceCard } from "../TechnicianPerformanceCard";

export function TechnicianPerformanceSlide({ data }) {
  return <main className="technician-performance dashboard-slide" aria-labelledby="technician-performance-title">
    <div className="technician-performance__heading">
      <div>
        <p>Today’s team standings</p>
        <h2 id="technician-performance-title">Technician Performance</h2>
      </div>
      <span>Overall rank and key metrics</span>
    </div>
    <section className="technician-performance__grid" aria-label="Technician performance cards">
      {data.technicians.map((technician) => <TechnicianPerformanceCard key={technician.id} technician={technician} />)}
    </section>
  </main>;
}
