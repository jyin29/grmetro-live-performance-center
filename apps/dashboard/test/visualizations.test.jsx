import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { KpiComparisonChart } from "../src/components/KpiComparisonChart";
import { RevenueChart } from "../src/components/RevenueChart";
import { TechnicianRankingChart } from "../src/components/TechnicianRankingChart";
import { SlideDeck } from "../src/components/SlideDeck";
import { PRESENTATION_SLIDES } from "../src/config/slideRegistry";
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
  it("registers and renders the five indexed dashboard slides", () => {
    const data = {
      technicians: [],
      slides: { revenue: { rows: [] }, performance: { rows: [] } },
    };
    const markup = renderToStaticMarkup(<SlideDeck data={data} slideIndex={0} />);
    expect(PRESENTATION_SLIDES).toHaveLength(5);
    expect(PRESENTATION_SLIDES.every(({ Component }) => typeof Component === "function")).toBe(true);
    expect(markup).toContain('data-slide-id="revenue-overview"');
    expect(markup).toContain("Today’s performance");
    expect(markup).toContain("Slide 1 of 5");
    expect(markup).toContain('aria-label="Show Revenue overview"');

    const performanceMarkup = renderToStaticMarkup(<SlideDeck data={{ ...data, technicians: [{
      id: 101, name: "Sample Technician", initials: "ST", overall: { rank: 1, qualifies: true, rankChange: 1 },
      kpis: { revenue: row.metrics[0], closingRate: { ...row.metrics[0], format: "percentage" }, billableServiceCalls: row.metrics[0], installRevenue: row.metrics[1], installAverageTicket: row.metrics[1] }
    }] }} slideIndex={1} />);
    expect(performanceMarkup).toContain('data-slide-id="technician-performance"');
    expect(performanceMarkup).toContain("Slide 2 of 5");
    expect(performanceMarkup).toContain("Technician Performance");
    expect(performanceMarkup).toContain("Install Revenue");
    expect(performanceMarkup).toContain("Data status");
    expect(performanceMarkup).toContain("No data");

    const businessMarkup = renderToStaticMarkup(<SlideDeck data={{ ...data, slides: {
      revenue: { axis: { maximum: 0, format: "currency" }, metrics: [], rows: [] },
      performance: { metrics: [], rows: [] }
    } }} slideIndex={2} />);
    expect(businessMarkup).toContain('data-slide-id="business-performance"');
    expect(businessMarkup).toContain("Slide 3 of 5");
    expect(businessMarkup).toContain("Business Performance");
    expect(businessMarkup).toContain("Revenue by Technician");
    expect(businessMarkup).toContain("Closing Performance");

    const recognitionMarkup = renderToStaticMarkup(<SlideDeck data={{ ...data, technicians: [{
      id: 101, name: "Sample Technician", shortName: "Sample", initials: "ST", overall: { rank: 1, qualifies: true, rankChange: 1 },
      kpis: { revenue: { value: 12000, hasData: true, format: "currency", rank: 1 }, closingRate: { value: 72, hasData: true, format: "percentage", rank: 1 } }
    }] }} slideIndex={3} />);
    expect(recognitionMarkup).toContain('data-slide-id="recognition"');
    expect(recognitionMarkup).toContain("Slide 4 of 5");
    expect(recognitionMarkup).toContain("Today’s Top Performer");
    expect(recognitionMarkup).toContain("Sample Technician");
    expect(recognitionMarkup).toContain("$12,000");
    expect(recognitionMarkup).toContain("72%");
    expect(recognitionMarkup).toContain("Overall Rank");
    expect(recognitionMarkup).toContain("Highest Revenue");

    const healthMarkup = renderToStaticMarkup(<SlideDeck data={data} slideIndex={4} presentationState={{}} />);
    expect(healthMarkup).toContain('data-slide-id="operations-health"');
    expect(healthMarkup).toContain("Operations Health");
    expect(healthMarkup).toContain("Slide 5 of 5");
  });

  it("uses the centralized 30-second rotation and wraps to Slide 1", () => {
    expect(SLIDE_ROTATION_INTERVAL_MS).toBe(30_000);
    expect(SLIDE_TRANSITION_DURATION_MS).toBeGreaterThanOrEqual(300);
    expect(SLIDE_TRANSITION_DURATION_MS).toBeLessThanOrEqual(500);
    const sequence = Array.from({ length: PRESENTATION_SLIDES.length + 1 }, (_, step) => {
      let index = 0;
      for (let advance = 0; advance < step; advance += 1) index = nextSlideIndex(index, PRESENTATION_SLIDES.length);
      return index + 1;
    });
    expect(sequence).toEqual([1, 2, 3, 4, 5, 1]);
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
