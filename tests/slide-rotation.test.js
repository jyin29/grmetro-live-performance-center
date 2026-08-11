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
});
