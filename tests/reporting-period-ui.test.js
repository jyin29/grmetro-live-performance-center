"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const slides = [
  "apps/dashboard/src/components/slides/RevenueOverviewSlide.jsx",
  "apps/dashboard/src/components/slides/BusinessPerformanceSlide.jsx",
  "apps/dashboard/src/components/slides/TechnicianPerformanceSlide.jsx",
  "apps/dashboard/src/components/slides/OperationsHealthSlide.jsx",
  "apps/dashboard/src/components/slides/RecognitionSlide.jsx"
];

test("all five dashboard slides render centralized reporting-period labels and dates", () => {
  for (const file of slides) {
    const source = read(file);
    assert.match(source, /reportingPeriod/);
    assert.match(source, /period\.dateRangeLabel/);
    assert.doesNotMatch(source, /data\.period\s*===\s*["']mtd["']/);
  }
});

test("technician filtering reflows TV rows and cards without fixed empty slots", () => {
  const css = read("apps/dashboard/src/tv-slide-polish.css");
  for (const variable of ["--pace-row-count","--sales-row-count","--closing-row-count","--operations-row-count","--technician-card-count"]) {
    assert.match(css, new RegExp(variable));
  }
  assert.match(read(slides[0]), /--pace-row-count/);
  assert.match(read(slides[1]), /--sales-row-count/);
  assert.match(read(slides[1]), /--closing-row-count/);
  assert.match(read(slides[2]), /--technician-card-count/);
  assert.match(read(slides[3]), /--operations-row-count/);
});

test("Slides 2 and 4 share rounded goal bubbles with prominent actual values", () => {
  const sales = read(slides[1]);
  const operations = read(slides[3]);
  const css = read("apps/dashboard/src/tv-slide-polish.css");
  assert.match(sales, /goal-progress-bubble/);
  assert.match(operations, /goal-progress-bubble/);
  assert.match(css, /\.goal-progress-bubble\s*\{[^}]*border-radius:999px/s);
  assert.match(css, /\.goal-progress-value__actual\s*\{[^}]*font-size:clamp\(40px,2\.6vw,52px\)/s);
  assert.doesNotMatch(`${sales}\n${operations}`, /metric-goal-inline|<span>\/<\/span>/);
});

test("revenue values receive dedicated large-screen emphasis", () => {
  const css = read("apps/dashboard/src/tv-slide-polish.css");
  assert.match(css, /\.pace-row__value\s*\{[^}]*font-size:clamp\(38px/s);
  assert.match(css, /\.technician-metric--revenue strong/);
  assert.match(css, /\.podium-card__metric--revenue/);
});

test("Windows packages include both reporting-period runtime modules", () => {
  const manifest = JSON.parse(read("scripts/windows/package-manifest.json"));
  assert.ok(manifest.files.includes("apps/backend/src/reporting/reportingPeriods.js"));
  assert.ok(manifest.files.includes("apps/dashboard/src/lib/reportingPeriod.js"));
});
