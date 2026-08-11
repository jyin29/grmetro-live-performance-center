const test = require("node:test");
const assert = require("node:assert/strict");
const { readFile } = require("node:fs/promises");
const path = require("node:path");

async function registeredSlides() {
  const source = await readFile(path.join(__dirname, "../apps/dashboard/src/config/slideRegistry.jsx"), "utf8");
  return [...source.matchAll(/\{ id: "([^"]+)", label: "([^"]+)", Component: ([^ }]+) \}/g)];
}

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

test("presentation controller keeps navigation and running state independent", async () => {
  const { createPresentationState, PRESENTATION_ACTIONS, presentationControllerReducer } = await import("../apps/dashboard/src/controller/presentationControllerState.js");
  const slideCount = (await registeredSlides()).length;
  const reduce = (state, type, detail = {}) => presentationControllerReducer(state, { type, slideCount, ...detail });
  let state = createPresentationState(slideCount);

  state = reduce(state, PRESENTATION_ACTIONS.PAUSE);
  assert.deepEqual(state, { activeSlideIndex: 0, isRunning: false });
  state = reduce(state, PRESENTATION_ACTIONS.NEXT);
  assert.deepEqual(state, { activeSlideIndex: 1, isRunning: false });
  state = reduce(state, PRESENTATION_ACTIONS.PREVIOUS);
  assert.equal(state.activeSlideIndex, 0);
  state = reduce(state, PRESENTATION_ACTIONS.PREVIOUS);
  assert.equal(state.activeSlideIndex, slideCount - 1);
  state = reduce(state, PRESENTATION_ACTIONS.SELECT, { index: 2 });
  assert.equal(state.activeSlideIndex, 2);
  state = reduce(state, PRESENTATION_ACTIONS.RESUME);
  assert.equal(state.isRunning, true);
});

test("one shared registry owns every rendered and controlled presentation slide", async () => {
  const slides = await registeredSlides();
  assert.deepEqual(slides.map(([, id]) => id), ["daily-pace", "team-performance", "revenue-sources", "top-three", "management-attention"]);
  assert.ok(slides.every((match) => match[3].endsWith("Slide")));

  const [deck, controller] = await Promise.all([
    readFile(path.join(__dirname, "../apps/dashboard/src/components/SlideDeck.jsx"), "utf8"),
    readFile(path.join(__dirname, "../apps/dashboard/src/controller/PresentationController.jsx"), "utf8"),
  ]);
  assert.match(deck, /PRESENTATION_SLIDES\.length/);
  assert.match(deck, /PRESENTATION_SLIDES\.map/);
  assert.match(controller, /slideCount = PRESENTATION_SLIDES\.length/);
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
