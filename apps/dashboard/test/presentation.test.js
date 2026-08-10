import { describe, expect, it } from "vitest";
import { dashboardStatus, formatMetric, freshness, performerGroups, rankedTechnicians, refreshLabel, summaryMetrics, technicianStatus } from "../src/lib/presentation";

describe("dashboard presentation helpers", () => {
  it("keeps zero distinct from unavailable data", () => {
    expect(formatMetric({ value: 0, hasData: true, format: "currency" })).toBe("$0");
    expect(formatMetric({ value: null, hasData: false, format: "currency" })).toBe("No data");
  });

  it("formats backend-prepared formats and freshness states", () => {
    expect(formatMetric({ value: 64.25, hasData: true, format: "percentage" })).toBe("64.3%");
    const now = Date.parse("2026-08-10T12:05:00Z");
    expect(refreshLabel("2026-08-10T12:01:00Z", now)).toBe("Updated 4 min ago");
    expect(freshness("2026-08-10T12:01:00Z", now)).toBe("stale");
  });

  it("uses backend ranks without recalculating business scores", () => {
    const technicians = [{ id: 1, name: "Alpha", overall: { rank: 2 } }, { id: 2, name: "Beta", overall: { rank: 1 } }];
    expect(rankedTechnicians(technicians).map(({ id }) => id)).toEqual([2, 1]);
    const metric = { value: 10, hasData: true, rank: 1, format: "integer" };
    expect(summaryMetrics({ technicians: [{ shortName: "Alpha", kpis: { revenue: metric } }] })[0]).toMatchObject({ technician: "Alpha", metric });
  });

  it("builds performer widgets from backend overall ranks", () => {
    const technicians = [1, 2, 3, 4, 5].map((rank) => ({ id: rank, overall: { rank, qualifies: true } }));
    expect(performerGroups(technicians).top.map(({ id }) => id)).toEqual([1, 2]);
    expect(performerGroups(technicians).bottom.map(({ id }) => id)).toEqual([5, 4]);
  });

  it("distinguishes backend and request status values", () => {
    expect(technicianStatus({ available: false })).toEqual({ label: "Unavailable", tone: "neutral" });
    expect(technicianStatus({ stale: true })).toEqual({ label: "Stale", tone: "warning" });
    expect(technicianStatus({ available: true, stale: false })).toEqual({ label: "Healthy", tone: "live" });
    expect(dashboardStatus({ cache: "fresh" }, { refreshing: true })).toEqual({ label: "Refreshing", tone: "refreshing" });
    expect(dashboardStatus({ cache: "stale" })).toEqual({ label: "Stale data", tone: "warning" });
    expect(dashboardStatus({ cache: "unavailable" })).toEqual({ label: "Data unavailable", tone: "neutral" });
  });
});
