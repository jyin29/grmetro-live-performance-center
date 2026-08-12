export function EventOverlay({ event }) {
  if (!event) return null;
  const lifetime = new Date(event.expiresAt).getTime() - new Date(event.createdAt).getTime();
  const style = { "--event-exit-delay": `${Math.max(0, lifetime - 400)}ms` };
  return <div className="event-overlay" role="status" aria-live="assertive" aria-atomic="true">
    <div className={`event-overlay__card event-overlay__card--${event.priority}`} style={style} tabIndex="-1">
      <span className="event-overlay__mark" aria-hidden="true">{event.priority === "critical" ? "!" : event.priority === "celebration" ? "★" : "i"}</span>
      <p>{event.eyebrow}</p><h2>{event.title}</h2><strong>{event.detail}</strong>
    </div>
  </div>;
}
