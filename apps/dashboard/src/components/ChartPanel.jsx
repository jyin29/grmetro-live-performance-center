export function ChartPanel({ eyebrow, title, meta, className = "", children }) {
  return <section className={`panel chart-panel ${className}`.trim()} tabIndex="0" aria-label={title}>
    <div className="panel__heading"><div><p>{eyebrow}</p><h2>{title}</h2></div>{meta && <span>{meta}</span>}</div>
    {children}
  </section>;
}
