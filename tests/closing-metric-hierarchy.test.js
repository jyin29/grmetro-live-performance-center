"use strict";

const { after, before, test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
let server; let React; let renderToStaticMarkup; let GoalProgressValue;

before(async () => {
  const { createServer } = await import("vite");
  React = await import("react");
  ({ renderToStaticMarkup } = await import("react-dom/server"));
  server = await createServer({ root: "apps/dashboard", server: { middlewareMode: true }, appType: "custom", logLevel: "silent" });
  ({ GoalProgressValue } = await server.ssrLoadModule("/src/components/GoalProgressValue.jsx"));
});

after(async () => server?.close());

function closingMetric(overrides = {}) {
  return { id: "closingRate", value: 55, hasData: true, format: "percentage", goal: 60, percentComplete: 91.6667, ...overrides };
}

test("closing hierarchy renders actual, labeled goal, and labeled attainment in order", () => {
  const markup = renderToStaticMarkup(React.createElement(GoalProgressValue, { metric: closingMetric() }));
  const actual = markup.indexOf("55%");
  const goal = markup.indexOf("of <strong>60%</strong> goal");
  const attainment = markup.indexOf("92% of goal achieved");
  assert.ok(actual >= 0 && goal > actual && attainment > goal, markup);
  assert.doesNotMatch(markup, />\s*\/\s*</);
});

test("closing hierarchy preserves zero and omits unavailable goal context", () => {
  const zero = renderToStaticMarkup(React.createElement(GoalProgressValue, { metric: closingMetric({ value: 0, percentComplete: 0 }) }));
  assert.match(zero, />0%</);
  assert.match(zero, /0% of goal achieved/);
  const unavailable = renderToStaticMarkup(React.createElement(GoalProgressValue, { metric: closingMetric({ value: null, hasData: false, percentComplete: null }) }));
  assert.match(unavailable, />N\/A</);
  assert.doesNotMatch(unavailable, /of goal achieved| goal</);
});

test("every closing presentation path uses the shared hierarchy", () => {
  for (const file of [
    "apps/dashboard/src/components/slides/BusinessPerformanceSlide.jsx",
    "apps/dashboard/src/components/slides/OperationsHealthSlide.jsx",
    "apps/dashboard/src/components/TechnicianMetric.jsx",
    "apps/dashboard/src/components/TechnicianDetail.jsx",
    "apps/dashboard/src/components/slides/RecognitionSlide.jsx",
  ]) assert.match(read(file), /GoalProgressValue/, file);
  const presentationSource = [
    read("apps/dashboard/src/components/slides/BusinessPerformanceSlide.jsx"),
    read("apps/dashboard/src/components/slides/OperationsHealthSlide.jsx"),
  ].join("\n");
  assert.doesNotMatch(presentationSource, /metric-goal-inline|<span>\/<\/span>/);
});

test("late TV styles make actual dominant and enlarge closing progress bars", () => {
  const base = read("apps/dashboard/src/styles.css");
  const tv = read("apps/dashboard/src/tv-slide-polish.css");
  const prior = read("apps/dashboard/src/final-tv-readability.css");
  const entry = read("apps/dashboard/src/main.jsx");
  assert.match(base, /goal-progress-value__actual[^}]*font-size:clamp\(32px,2vw,40px\)/);
  assert.match(tv, /closing-row \.goal-progress-value__actual[^}]*font-size:clamp\(48px,3\.15vw,64px\)/);
  assert.match(tv, /goal-progress-value__goal[^}]*font-size:clamp\(14px,\.9vw,18px\)/);
  assert.match(tv, /goal-progress-value__goal strong[^}]*font:inherit/);
  assert.match(tv, /goal-progress-value__attainment[^}]*font-size:clamp\(13px,\.84vw,17px\)/);
  assert.match(tv, /closing-row__bar[^}]*height:clamp\(38px,2\.55vw,50px\)/);
  assert.doesNotMatch(`${prior}\n${tv}`, /metric-goal-inline/);
  assert.ok(entry.indexOf('"./tv-slide-polish.css"') > entry.indexOf('"./final-tv-readability.css"'));
});

test("Windows packaging carries the shared goal hierarchy component", () => {
  const manifest = JSON.parse(read("scripts/windows/package-manifest.json"));
  assert.ok(manifest.files.includes("apps/dashboard/src/components/GoalProgressValue.jsx"));
});
