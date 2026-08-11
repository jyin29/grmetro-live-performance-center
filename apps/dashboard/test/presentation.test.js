import { describe, expect, it } from "vitest";
import { formatClock, formatMetric, freshness, rankedTechnicians, refreshLabel, summaryMetrics } from "../src/lib/presentation";

describe("dashboard presentation helpers", () => {
  it("keeps zero distinct from unavailable data", () => {
    expect(formatMetric({ value: 0, hasData: true, format: "currency" })).toBe("$0");
    expect(formatMetric({ value: null, hasData: false, format: "currency" })).toBe("No data");
  });

  it("formats backend-prepared formats and freshness states", () => {
    expect(formatMetric({ value: 64.25, hasData: true, format: "percentage" })).toBe("64.3%");
    const now = Date.parse("2026-08-10T12:05:00Z");
    expect(refreshLabel("2026-08-10T12:04:42Z", now)).toBe("Updated 18 sec ago");
    expect(refreshLabel("2026-08-10T12:03:57Z", now)).toBe("Updated 1 min 03 sec ago");
    expect(refreshLabel("2026-08-10T12:01:00Z", now)).toBe("Updated 4 min 00 sec ago");
    expect(freshness("2026-08-10T12:01:00Z", now)).toBe("stale");
    expect(refreshLabel(null, now)).toBe("Waiting for live data");
    expect(formatClock(now)).toMatch(/\d{1,2}:05:00\s[AP]M/);
  });

  it("uses backend ranks without recalculating business scores", () => {
    const technicians = [{ id: 1, name: "Alpha", overall: { rank: 2 } }, { id: 2, name: "Beta", overall: { rank: 1 } }];
    expect(rankedTechnicians(technicians).map(({ id }) => id)).toEqual([2, 1]);
    const metric = { value: 10, hasData: true, rank: 1, format: "integer" };
    expect(summaryMetrics({ technicians: [{ shortName: "Alpha", kpis: { revenue: metric } }] })[0]).toMatchObject({ technician: "Alpha", metric });
  });
});
