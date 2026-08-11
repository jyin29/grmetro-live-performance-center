import { describe, expect, it } from "vitest";
import { formatClock, formatMetric, freshness, managementInsights, rankedTechnicians, recognitionPresentation, refreshLabel, summaryMetrics } from "../src/lib/presentation";

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

  it("builds recognition from backend-prepared ranks and rank movement", () => {
    const technicians = [
      { id: 1, name: "Alpha", shortName: "Alpha", overall: { rank: 2, qualifies: true, rankChange: 2 }, kpis: { revenue: { hasData: true, rank: 1 }, closingRate: { hasData: true, rank: 2 } } },
      { id: 2, name: "Beta", shortName: "Beta", overall: { rank: 1, qualifies: true, rankChange: 1 }, kpis: { revenue: { hasData: true, rank: 2 }, closingRate: { hasData: true, rank: 1 } } }
    ];
    const presentation = recognitionPresentation(technicians);
    expect(presentation.featured.name).toBe("Beta");
    expect(presentation.recognitions.map(({ technician }) => technician.name)).toEqual(["Alpha", "Alpha", "Beta", "Beta"]);
  });

  it("prioritizes feed, rank, quality, goal, and movement insights without calculating KPIs", () => {
    const data = {
      refreshedAt: "2026-08-10T12:00:00Z",
      slides: { revenue: { metrics: [{ id: "revenue", label: "Revenue" }, { id: "installRevenue", label: "Install Revenue" }] } },
      technicians: [
        { id: 1, name: "Alpha", shortName: "Alpha", overall: { rank: 2, qualifies: true, rankChange: -1 }, kpis: { revenue: { hasData: true, reached: true, percentComplete: 105 }, installRevenue: { hasData: false, dataQuality: "unavailable" } } },
        { id: 2, name: "Beta", shortName: "Beta", overall: { rank: 1, qualifies: true, rankChange: 1 }, kpis: { revenue: { hasData: true, reached: false, percentComplete: 80 } } }
      ]
    };
    const insights = managementInsights(data, {}, Date.parse("2026-08-10T12:11:00Z"));
    expect(insights).toHaveLength(2);
    expect(insights.map(({ priority }) => priority)).toEqual(["critical", "warning"]);
    expect(insights[0].id).toBe("feed-critical");
    expect(insights[1].title).toContain("moved down 1 place");

    const informational = managementInsights({ ...data, refreshedAt: "2026-08-10T12:10:45Z", technicians: data.technicians.map((technician) => ({ ...technician, overall: { ...technician.overall, rankChange: Math.max(0, technician.overall.rankChange) }, kpis: { revenue: technician.kpis.revenue } })) }, {}, Date.parse("2026-08-10T12:11:00Z"));
    expect(informational.map(({ priority }) => priority)).toEqual(["informational", "informational"]);
    expect(informational.map(({ eyebrow }) => eyebrow)).toEqual(["Goal achieved", "Ranking movement"]);
  });
});
