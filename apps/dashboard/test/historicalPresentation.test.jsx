import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ComparisonValue } from "../src/components/ComparisonValue";
import { Sparkline } from "../src/components/Sparkline";
import { TrendIndicator } from "../src/components/TrendIndicator";
import { formatComparison, metricHistory, trendPresentation } from "../src/lib/historicalPresentation";

describe("historical presentation", () => {
  it("renders every backend trend label without calculating a trend", () => {
    expect(trendPresentation({ trend: "increasing" })).toMatchObject({ symbol: "▲", label: "Increasing" });
    expect(trendPresentation({ trend: "decreasing" })).toMatchObject({ symbol: "▼", label: "Decreasing" });
    expect(trendPresentation({ trend: "stable" })).toMatchObject({ symbol: "→", label: "Stable" });
    expect(trendPresentation({ trend: "unknown" })).toMatchObject({ symbol: "", label: "Unknown" });

    const markup = renderToStaticMarkup(<TrendIndicator trend={{ available: true, trend: "improving", consecutiveIncreases: 4, consecutiveDecreases: 0 }} streakNoun="improvements" />);
    expect(markup).toContain("▲");
    expect(markup).toContain("Improving");
    expect(markup).toContain("4 consecutive improvements");
  });

  it("renders compact currency, percentage, and ranking comparisons", () => {
    const comparison = { available: true, delta: 1200 };
    expect(formatComparison(comparison, "currency")).toBe("+$1,200");
    expect(formatComparison({ ...comparison, delta: -3 }, "percentage")).toBe("-3%");
    expect(formatComparison({ ...comparison, delta: 2 }, null, "rank")).toBe("+2 places");
    expect(renderToStaticMarkup(<ComparisonValue comparison={comparison} format="currency" />)).toContain("+$1,200");
  });

  it("preserves explicit unknown trends and omits missing history", () => {
    expect(renderToStaticMarkup(<TrendIndicator trend={{ available: false, trend: "unknown", reason: "insufficient-history" }} />)).toContain("Unknown");
    expect(renderToStaticMarkup(<TrendIndicator />)).toBe("");
    expect(renderToStaticMarkup(<ComparisonValue comparison={{ available: false, delta: null }} format="currency" />)).toBe("");
    expect(metricHistory({}, 101, "revenue")).toEqual({ comparison: null, trends: null });
  });

  it("draws a lightweight SVG sparkline only with sufficient points", () => {
    const markup = renderToStaticMarkup(<Sparkline points={[10, 14, 13, 18]} label="Revenue history" />);
    expect(markup).toContain("<svg");
    expect(markup).toContain("<polyline");
    expect(markup).toContain('aria-label="Revenue history"');
    expect(renderToStaticMarkup(<Sparkline points={[10]} />)).toBe("");
    expect(renderToStaticMarkup(<Sparkline />)).toBe("");
  });
});
