const TREND_PRESENTATION = Object.freeze({
  increasing: { symbol: "▲", label: "Increasing", tone: "positive" },
  improving: { symbol: "▲", label: "Improving", tone: "positive" },
  decreasing: { symbol: "▼", label: "Decreasing", tone: "negative" },
  declining: { symbol: "▼", label: "Declining", tone: "negative" },
  stable: { symbol: "→", label: "Stable", tone: "stable" },
  unknown: { symbol: "", label: "Unknown", tone: "unknown" }
});

export function trendPresentation(trend) {
  return TREND_PRESENTATION[trend?.trend] || TREND_PRESENTATION.unknown;
}

export function technicianHistory(data, technicianId) {
  const id = String(technicianId);
  return {
    comparison: data?.historicalComparison?.technicians?.[id] || null,
    trends: data?.historicalTrends?.technicians?.[id] || null
  };
}

export function metricHistory(data, technicianId, metricId) {
  const history = technicianHistory(data, technicianId);
  return {
    comparison: history.comparison?.kpis?.[metricId] || null,
    trends: history.trends?.kpis?.[metricId] || null
  };
}

export function formatComparison(comparison, format, kind = "value") {
  if (!comparison?.available || !Number.isFinite(comparison.delta)) return null;
  const delta = comparison.delta;
  if (delta === 0) return kind === "rank" ? "No change" : format === "percentage" || kind === "goalProgress" ? "0%" : "0";
  const sign = delta > 0 ? "+" : "-";
  const absolute = Math.abs(delta);
  if (kind === "rank") return `${sign}${new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(absolute)} ${absolute === 1 ? "place" : "places"}`;
  if (format === "currency") return `${sign}${new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(absolute)}`;
  if (format === "percentage" || kind === "goalProgress") return `${sign}${new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(absolute)}%`;
  return `${sign}${new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(absolute)}`;
}

export function trendStreak(trend, noun = "increases") {
  if (!trend?.available) return null;
  if (trend.consecutiveIncreases > 1) return `${trend.consecutiveIncreases} consecutive ${noun}`;
  if (trend.consecutiveDecreases > 1) return `${trend.consecutiveDecreases} consecutive ${noun === "improvements" ? "declines" : "decreases"}`;
  return null;
}
