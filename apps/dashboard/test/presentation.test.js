import { describe, expect, it } from "vitest";
import { clockParts, formatMetric, freshness, rankedTechnicians, refreshLabel, refreshTime, summaryMetrics } from "../src/lib/presentation";

describe("dashboard presentation helpers", () => {
  it("keeps zero distinct from unavailable data", () => {
    expect(formatMetric({ value: 0, hasData: true, format: "currency" })).toBe("$0");
    expect(formatMetric({ value: null, hasData: false, format: "currency" })).toBe("No data");
  });

  it("formats backend-prepared formats and freshness states", () => {
    expect(formatMetric({ value: 64.25, hasData: true, format: "percentage" })).toBe("64.3%");
    const now = Date.parse("2026-08-10T12:05:00Z");
    expect(refreshLabel("2026-08-10T12:01:00Z", now)).toBe("4 minutes ago");
    expect(freshness("2026-08-10T12:01:00Z", now)).toBe("stale");
  });

  it("formats exact and relative refresh times independently", () => {
    const now = Date.parse("2026-08-10T12:05:00Z");
    expect(refreshLabel("2026-08-10T12:04:48Z", now)).toBe("12 seconds ago");
    expect(refreshLabel("2026-08-10T12:04:58Z", now)).toBe("Just now");
    expect(refreshTime("2026-08-10T12:04:48Z")).toMatch(/12:04:48/);
    expect(clockParts(now)).toMatchObject({ weekday: "Monday", date: "August 10, 2026" });
  });

  it("uses the approved freshness thresholds", () => {
    const now = Date.parse("2026-08-10T12:05:00Z");
    expect(freshness("2026-08-10T12:03:01Z", now)).toBe("live");
    expect(freshness("2026-08-10T12:03:00Z", now)).toBe("stale");
    expect(freshness("2026-08-10T12:00:00Z", now)).toBe("offline");
  });

  it("uses backend ranks without recalculating business scores", () => {
    const technicians = [{ id: 1, name: "Alpha", overall: { rank: 2 } }, { id: 2, name: "Beta", overall: { rank: 1 } }];
    expect(rankedTechnicians(technicians).map(({ id }) => id)).toEqual([2, 1]);
    const metric = { value: 10, hasData: true, rank: 1, format: "integer" };
    expect(summaryMetrics({ technicians: [{ shortName: "Alpha", kpis: { revenue: metric } }] })[0]).toMatchObject({ technician: "Alpha", metric });
  });
});
