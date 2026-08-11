import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { KpiComparisonChart } from "../src/components/KpiComparisonChart";
import { RevenueChart } from "../src/components/RevenueChart";
import { TechnicianRankingChart } from "../src/components/TechnicianRankingChart";
import { dashboardSlides, SlideDeck } from "../src/components/SlideDeck";
import { nextSlideIndex, SLIDE_ROTATION_INTERVAL_MS, SLIDE_TRANSITION_DURATION_MS } from "../src/config/slideRotation";

const row = {
  technicianId: 101,
  name: "Sample Technician",
  shortName: "Sample",
  metrics: [
    { id: "revenue", value: 12000, hasData: true, format: "currency", normalizedRatio: .8 },
    { id: "serviceRevenue", value: null, hasData: false, format: "currency", normalizedRatio: null }
  ]
};

describe("dashboard visualizations", () => {
  it("registers and renders the two indexed dashboard slides", () => {
    const data = {
      technicians: [],
      slides: { revenue: { rows: [] }, performance: { rows: [] } },
    };
    const markup = renderToStaticMarkup(<SlideDeck data={data} slideIndex={0} />);
    expect(dashboardSlides).toHaveLength(2);
    expect(markup).toContain('data-slide-id="revenue-overview"');
    expect(markup).toContain("Today’s performance");
    expect(markup).toContain("Slide 1 of 2");
    expect(markup).toContain('aria-label="Show Revenue overview"');

    const performanceMarkup = renderToStaticMarkup(<SlideDeck data={{ ...data, technicians: [{
      id: 101, name: "Sample Technician", initials: "ST", overall: { rank: 1, qualifies: true, rankChange: 1 },
      kpis: { revenue: row.metrics[0], closingRate: { ...row.metrics[0], format: "percentage" }, billableServiceCalls: row.metrics[0], installRevenue: row.metrics[1], installAverageTicket: row.metrics[1] }
    }] }} slideIndex={1} />);
    expect(performanceMarkup).toContain('data-slide-id="technician-performance"');
    expect(performanceMarkup).toContain("Technician Performance");
    expect(performanceMarkup).toContain("Install Revenue");
    expect(performanceMarkup).toContain("Data status");
    expect(performanceMarkup).toContain("No data");
  });

  it("uses the centralized 30-second rotation and wraps to Slide 1", () => {
    expect(SLIDE_ROTATION_INTERVAL_MS).toBe(30_000);
    expect(SLIDE_TRANSITION_DURATION_MS).toBeGreaterThanOrEqual(300);
    expect(SLIDE_TRANSITION_DURATION_MS).toBeLessThanOrEqual(500);
    expect(nextSlideIndex(0, dashboardSlides.length)).toBe(1);
    expect(nextSlideIndex(1, dashboardSlides.length)).toBe(0);
  });

  it("renders accessible overlaid revenue bars without turning missing data into zero", () => {
    const slide = { axis: { maximum: 15000, format: "currency" }, metrics: [
      { id: "revenue", label: "Revenue", color: "#D4AF37" },
      { id: "serviceRevenue", label: "Service Revenue", color: "#0F766E" }
    ], rows: [row] };
    const markup = renderToStaticMarkup(<RevenueChart slide={slide} />);
    expect(markup).toContain("Revenue by technician");
    expect(markup).toContain("$12,000");
    expect(markup).toContain("Sample");
  });

  it("renders backend-prepared KPI values and overall ranking", () => {
    const comparison = renderToStaticMarkup(<KpiComparisonChart slide={{ metrics: [
      { id: "revenue", label: "Revenue", color: "#D4AF37" },
      { id: "serviceRevenue", label: "Service Revenue", color: "#0F766E" }
    ], rows: [row] }} />);
    expect(comparison).toContain("No data");

    const ranking = renderToStaticMarkup(<TechnicianRankingChart technicians={[
      { id: 101, name: "Sample Technician", initials: "ST", overall: { rank: 1, qualifies: true, rankChange: 1 } }
    ]} />);
    expect(ranking).toContain("#1");
    expect(ranking).toContain("↑1");
  });
});
