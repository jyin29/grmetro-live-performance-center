export function LoadingView() {
  return <main className="dashboard-grid" aria-busy="true" aria-label="Loading dashboard">
    <section className="summary-grid">{Array.from({ length: 4 }, (_, index) => <div className="kpi-card skeleton" key={index}><i /><b /><span /></div>)}</section>
    <section className="panel skeleton skeleton--large"><i /><b /><span /></section>
    <aside className="panel skeleton skeleton--large"><i /><b /><span /></aside>
  </main>;
}
