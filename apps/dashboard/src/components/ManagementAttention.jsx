const SYMBOLS = Object.freeze({ critical: "!", warning: "!", informational: "i" });

export function ManagementAttention({ insights = [] }) {
  if (!insights.length) return null;

  return <aside className="management-attention" aria-label="Management attention" aria-live="polite">
    <span className="management-attention__label">Management attention</span>
    <div className="management-attention__items">
      {insights.map((insight) => <article className={`management-insight management-insight--${insight.priority}`} key={insight.id}>
        <span className="management-insight__symbol" aria-hidden="true">{SYMBOLS[insight.priority]}</span>
        <div><p>{insight.eyebrow} · {insight.priority}</p><strong>{insight.title}</strong><span>{insight.detail}</span></div>
      </article>)}
    </div>
  </aside>;
}
