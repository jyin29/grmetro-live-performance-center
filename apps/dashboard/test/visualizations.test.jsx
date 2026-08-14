import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { KpiComparisonChart } from "../src/components/KpiComparisonChart";
import { ManagementAttention } from "../src/components/ManagementAttention";
import { RevenueChart } from "../src/components/RevenueChart";
import { TechnicianRankingChart } from "../src/components/TechnicianRankingChart";
import { TechnicianPerformanceCard } from "../src/components/TechnicianPerformanceCard";
import { SlideDeck } from "../src/components/SlideDeck";
import { BusinessPerformanceSlide, SalesPipelineMatrix } from "../src/components/slides/BusinessPerformanceSlide";
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
  it("renders prioritized management attention with consistent priority treatments", () => {
    const markup = renderToStaticMarkup(<ManagementAttention insights={[
      { id: "feed", priority: "critical", eyebrow: "Feed health", title: "Updates interrupted", detail: "Showing cached data." },
      { id: "rank", priority: "informational", eyebrow: "Ranking movement", title: "Sample climbed 1 place", detail: "Now ranked #2." }
    ]} />);
    expect(markup).toContain('aria-label="Management attention"');
    expect(markup).toContain("management-insight--critical");
    expect(markup).toContain("management-insight--informational");
  });

  it("registers and renders the five indexed dashboard slides", () => {
    const data = {
      technicians: [],
      slides: { revenue: { rows: [] }, activity: { rows: [] }, performance: { rows: [] }, "average-ticket": { rows: [] } },
    };
    const markup = renderToStaticMarkup(<SlideDeck data={data} slideIndex={0} />);
    expect(PRESENTATION_SLIDES).toHaveLength(5);
    expect(PRESENTATION_SLIDES.every(({ Component }) => typeof Component === "function")).toBe(true);
    expect(markup).toContain('data-slide-id="revenue"');
    expect(markup).toContain("Revenue &amp; Goal Progress");
    expect(markup).toContain("Slide 1 of 5");
    expect(markup).toContain('aria-label="Show Revenue"');

    const performanceMarkup = renderToStaticMarkup(<SlideDeck data={{ ...data, technicians: [{
      id: 101, name: "Sample Technician", initials: "ST", overall: { rank: 1, qualifies: true, rankChange: 1 },
      kpis: { revenue: row.metrics[0], closingRate: { ...row.metrics[0], format: "percentage" }, billableServiceCalls: row.metrics[0], installRevenue: row.metrics[1], installAverageTicket: row.metrics[1] }
    }] }} slideIndex={1} />);
    expect(performanceMarkup).toContain('data-slide-id="sales"');
    expect(performanceMarkup).toContain("Slide 2 of 5");
    expect(performanceMarkup).toContain("Sales");
    expect(performanceMarkup).toContain("Closing %");

    const businessMarkup = renderToStaticMarkup(<SlideDeck data={{ ...data, slides: {
      revenue: { axis: { maximum: 0, format: "currency" }, metrics: [], rows: [] },
      performance: { metrics: [], rows: [] }
    } }} slideIndex={2} />);
    expect(businessMarkup).toContain('data-slide-id="technicians"');
    expect(businessMarkup).toContain("Slide 3 of 5");
    expect(businessMarkup).toContain("Technicians");

    const recognitionMarkup = renderToStaticMarkup(<SlideDeck data={{ ...data, technicians: [{
      id: 101, name: "Sample Technician", shortName: "Sample", initials: "ST", overall: { rank: 1, qualifies: true, rankChange: 1 },
      kpis: { revenue: { value: 12000, hasData: true, format: "currency", rank: 1 }, closingRate: { value: 72, hasData: true, format: "percentage", rank: 1 } }
    }] }} slideIndex={3} />);
    expect(recognitionMarkup).toContain('data-slide-id="operations"');
    expect(recognitionMarkup).toContain("Slide 4 of 5");
    expect(recognitionMarkup).toContain("Operations");
    expect(recognitionMarkup).toContain("Service &amp; Install Activity");

    const healthMarkup = renderToStaticMarkup(<SlideDeck data={data} slideIndex={4} presentationState={{}} />);
    expect(healthMarkup).toContain('data-slide-id="recognition"');
    expect(healthMarkup).toContain("Top 3 coming soon");
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

  it("renders backend-prepared KPI values, omits empty metric lanes, and preserves overall ranking", () => {
    const comparison = renderToStaticMarkup(<KpiComparisonChart slide={{ metrics: [
      { id: "revenue", label: "Revenue", color: "#D4AF37" },
      { id: "serviceRevenue", label: "Service Revenue", color: "#0F766E" }
    ], rows: [row] }} />);
    expect(comparison).toContain("$12,000");
    expect(comparison).not.toContain("Service Revenue");

    const unavailable = renderToStaticMarkup(<KpiComparisonChart slide={{ metrics: [
      { id: "serviceRevenue", label: "Service Revenue", color: "#0F766E" }
    ], rows: [row] }} metricIds={["serviceRevenue"]} />);
    expect(unavailable).toContain("No validated data");
    expect(unavailable).toContain("Awaiting approved ServiceTitan mapping");

    const ranking = renderToStaticMarkup(<TechnicianRankingChart technicians={[
      { id: 101, name: "Sample Technician", initials: "ST", overall: { rank: 1, qualifies: true, rankChange: 1 } }
    ]} />);
    expect(ranking).toContain("#1");
    expect(ranking).toContain("↑1");
  });

  it("renders the five television-priority technician metrics without confirmed-status clutter", () => {
    const kpis = Object.fromEntries([
      ["revenue", 12000, "currency"], ["closingRate", 72, "percentage"], ["billableServiceCalls", 8, "integer"],
      ["installRevenue", 4800, "currency"], ["installAverageTicket", 2400, "currency"]
    ].map(([id, value, format]) => [id, { id, value, format, hasData: true, dataQuality: "confirmed" }]));
    const markup = renderToStaticMarkup(<TechnicianPerformanceCard technician={{ id: 101, name: "Sample Technician", initials: "ST", overall: { rank: 1, qualifies: true, rankChange: 0 }, kpis }} data={{}} />);
    for (const label of ["Revenue", "Closing %", "Billable Calls", "Install Revenue", "Average Ticket"]) expect(markup).toContain(label);
    expect(markup).not.toContain("Data status");
  });

  it("renders Sales as a wide-left shared-row pipeline and narrow-right Closing list with visible zeroes", () => {
    const metricDefinitions = [
      ["opportunities", "Opportunities"], ["techLeads", "Tech Leads"],
      ["marketedLeads", "Marketed Leads"], ["membershipsSold", "Memberships Sold"]
    ].map(([id, label]) => ({ id, label, color: "#087f83" }));
    const pipelineRows = ["Alex K", "Charlie E", "Dwight", "Julio Torres", "Shamon Ward"].map((name, index) => ({
      technicianId: index + 1, name, shortName: name,
      metrics: metricDefinitions.map(({ id }) => ({ id, value: id === "techLeads" && name === "Dwight" ? 1 : 0, hasData: true, format: "integer", normalizedRatio: id === "techLeads" && name === "Dwight" ? 1 : 0 }))
    }));
    const closingRows = pipelineRows.map((row) => ({ ...row, metrics: [{ id: "closingRate", value: 0, hasData: true, format: "percentage", normalizedRatio: 0 }] }));
    const data = { slides: { activity: { metrics: metricDefinitions, rows: pipelineRows }, performance: { rows: closingRows } } };
    const markup = renderToStaticMarkup(<BusinessPerformanceSlide data={data} />);
    expect(markup.indexOf("Pipeline &amp; Lead Activity")).toBeLessThan(markup.indexOf("Closing %"));
    for (const label of ["Opportunities", "Tech Leads", "Marketed Leads", "Memberships Sold", "Closing %"]) expect(markup).toContain(label);
    expect(markup.match(/0%/g)).toHaveLength(5);
    expect(markup).toContain("Tech Leads: 1");

    const pipelineMarkup = renderToStaticMarkup(<SalesPipelineMatrix slide={data.slides.activity} />);
    for (const name of ["Alex K", "Charlie E", "Dwight", "Julio Torres", "Shamon Ward"]) expect(pipelineMarkup.match(new RegExp(name, "g"))).toHaveLength(1);

    const css = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");
    expect(css).toMatch(/\.business-performance\s*\{[^}]*grid-template:[^}]*2\.08fr[^}]*1fr/);
  });

  it("labels tied Revenue Rank and unavailable Overall Rank without an unexplained unknown state", () => {
    const kpis = Object.fromEntries([
      ["revenue", 0, "currency"], ["closingRate", 0, "percentage"], ["opportunities", 0, "integer"],
      ["techLeads", 0, "integer"], ["marketedLeads", 0, "integer"]
    ].map(([id, value, format]) => [id, { id, value, format, hasData: true, dataQuality: "confirmed", rank: 1, rankLabel: id === "revenue" ? "T-1" : "#1" }]));
    const markup = renderToStaticMarkup(<TechnicianPerformanceCard technician={{ id: 101, name: "Alex K", initials: "AK", overall: { rank: null, qualifies: false, rankChange: null }, kpis }} data={{}} />);
    expect(markup).toContain("Revenue Rank");
    expect(markup).toContain("T-1");
    expect(markup).toContain("Overall Rank · Not qualified");
    expect(markup).not.toContain("Unknown");
  });

  it("uses responsive room-distance typography for technician KPI values", () => {
    const css = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");
    expect(css).toMatch(/\.technician-metric strong[^}]*font-size:\s*clamp\(34px,\s*2\.35vw,\s*48px\)/);
    expect(css).toContain("@media (max-height: 760px)");
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
  });
});
