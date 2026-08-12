import { formatComparison } from "../lib/historicalPresentation";

export function ComparisonValue({ comparison, format, kind = "value" }) {
  const value = formatComparison(comparison, format, kind);
  if (value === null) return null;
  const tone = comparison.delta > 0 ? "positive" : comparison.delta < 0 ? "negative" : "stable";
  const symbol = comparison.delta > 0 ? "▲" : comparison.delta < 0 ? "▼" : "→";
  return <span className={`comparison-value comparison-value--${tone}`} aria-label={`Change: ${value}`}><span aria-hidden="true">{symbol}</span> {value}</span>;
}
