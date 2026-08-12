import { trendPresentation, trendStreak } from "../lib/historicalPresentation";

export function TrendIndicator({ trend, streakNoun, compact = false }) {
  if (!trend) return null;
  const presentation = trendPresentation(trend);
  const streak = trendStreak(trend, streakNoun);
  return <span className={`trend-indicator trend-indicator--${presentation.tone}`} aria-label={`Trend: ${presentation.label}`}>
    <span aria-hidden="true">{presentation.symbol}</span> {presentation.label}
    {!compact && streak && <small>{streak}</small>}
  </span>;
}
