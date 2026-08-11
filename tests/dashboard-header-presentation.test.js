const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

describe("dashboard status header presentation", () => {
  it("formats refresh ages and applies freshness thresholds", async () => {
    const { freshness, refreshLabel } = await import("../apps/dashboard/src/lib/presentation.js");
    const now = Date.parse("2026-08-10T12:05:00Z");

    assert.equal(refreshLabel("2026-08-10T12:04:58Z", now), "Just now");
    assert.equal(refreshLabel("2026-08-10T12:04:48Z", now), "12 seconds ago");
    assert.equal(refreshLabel("2026-08-10T12:03:00Z", now), "2 minutes ago");
    assert.equal(freshness("2026-08-10T12:03:01Z", now), "live");
    assert.equal(freshness("2026-08-10T12:03:00Z", now), "stale");
    assert.equal(freshness("2026-08-10T12:00:00Z", now), "offline");
  });

  it("includes weekday, date, exact refresh time, and seconds", async () => {
    const { clockParts, refreshTime } = await import("../apps/dashboard/src/lib/presentation.js");
    const now = Date.parse("2026-08-10T12:05:00Z");

    assert.deepEqual(clockParts(now), { weekday: "Monday", date: "August 10, 2026", time: "12:05:00 PM" });
    assert.match(refreshTime("2026-08-10T12:04:48Z"), /12:04:48 PM/);
  });
});
