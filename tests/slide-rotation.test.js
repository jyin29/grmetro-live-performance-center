const test = require("node:test");
const assert = require("node:assert/strict");

test("dashboard rotation uses one 30-second configuration and wraps to Slide 1", async () => {
  const {
    nextSlideIndex,
    SLIDE_ROTATION_INTERVAL_MS,
    SLIDE_TRANSITION_DURATION_MS,
  } = await import("../apps/dashboard/src/config/slideRotation.js");

  assert.equal(SLIDE_ROTATION_INTERVAL_MS, 30_000);
  assert.ok(SLIDE_TRANSITION_DURATION_MS >= 300);
  assert.ok(SLIDE_TRANSITION_DURATION_MS <= 500);
  assert.equal(nextSlideIndex(0, 2), 1);
  assert.equal(nextSlideIndex(1, 2), 0);
  assert.equal(nextSlideIndex(0, 0), 0);
  assert.equal(nextSlideIndex(4, 5), 0);
});

test("operations health presentation uses only existing dashboard and presentation state", async () => {
  const { operationsHealthPresentation } = await import("../apps/dashboard/src/lib/presentation.js");
  const refreshedAt = "2026-08-11T12:00:00.000Z";
  const data = { refreshedAt, technicians: [{ id: "one" }, { id: "two" }] };
  const health = operationsHealthPresentation(data, { refreshing: false, hasError: false, rotationPaused: false }, new Date(refreshedAt).getTime() + 20_000);

  assert.equal(health.overall.label, "Dashboard Healthy");
  assert.deepEqual(health.cards.map(({ id }) => id), ["refresh", "refresh-state", "cache", "technicians", "slide", "rotation"]);
  assert.equal(health.cards.find(({ id }) => id === "technicians").value, "2");
  assert.equal(health.cards.find(({ id }) => id === "slide").detail, "Slide 5 of 5");
  assert.equal(health.cards.find(({ id }) => id === "rotation").value, "Running");
});
