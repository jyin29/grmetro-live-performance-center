export function RecognitionCard({ recognition }) {
  return <article className="recognition-card">
    <span className="recognition-card__symbol" aria-hidden="true">{recognition.symbol}</span>
    <div>
      <p>{recognition.label}</p>
      <strong>{recognition.technician.shortName ?? recognition.technician.name}</strong>
    </div>
  </article>;
}
