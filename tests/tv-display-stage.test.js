"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");

test("TV display stage scales a 1920 by 1080 canvas with contain sizing", async () => {
  const { calculateDisplayStage, collectDisplayStageDiagnostics } = await import("../apps/dashboard/src/lib/displayStage.js");
  assert.deepEqual(calculateDisplayStage(1920, 1080), {
    logicalWidth: 1920, logicalHeight: 1080, viewportWidth: 1920, viewportHeight: 1080,
    scale: 1, renderedWidth: 1920, renderedHeight: 1080, offsetX: 0, offsetY: 0,
  });
  assert.equal(calculateDisplayStage(3840, 2160).scale, 2);
  assert.equal(calculateDisplayStage(1280, 720).scale, 2 / 3);
  const unusual = calculateDisplayStage(1600, 1000);
  assert.equal(unusual.scale, 5 / 6);
  assert.equal(unusual.renderedWidth, 1600);
  assert.equal(unusual.renderedHeight, 900);
  assert.equal(unusual.offsetY, 50);
  const diagnostics = collectDisplayStageDiagnostics({
    windowRef: { innerWidth: 1280, innerHeight: 720, devicePixelRatio: 3, screen: { width: 3840, height: 2160 }, visualViewport: { width: 1280, height: 720, scale: 1 }, navigator: { userAgent: "BrowseHere test" } },
    documentRef: { documentElement: { clientWidth: 1264, clientHeight: 704 } },
    viewportElement: { getBoundingClientRect: () => ({ width: 1280, height: 720 }) },
  });
  assert.equal(diagnostics.displayStageScale, 2 / 3);
  assert.equal(diagnostics.renderedWidth, 1280);
  assert.equal(diagnostics.screenWidth, 3840);
  assert.equal(diagnostics.documentClientWidth, 1264);
  assert.equal(diagnostics.userAgent, "BrowseHere test");
});

test("spreadsheet eligibility excludes absent content and restores present content", async () => {
  const { filterEligibleSlides, normalizePresentationSelection, resolveActiveEligibleSlide } = await import("../apps/dashboard/src/config/slideEligibility.js");
  const slides = [{ id: "revenue" }, { id: "sales" }, { id: "technicians" }, { id: "operations" }, { id: "recognition" }, { id: "spreadsheet", requiresSpreadsheet: true }];
  assert.deepEqual(filterEligibleSlides(slides, false).map(({ id }) => id), ["revenue", "sales", "technicians", "operations", "recognition"]);
  assert.deepEqual(filterEligibleSlides(slides, true).map(({ id }) => id), ["revenue", "sales", "technicians", "operations", "recognition", "spreadsheet"]);
  const normalized = normalizePresentationSelection({ activeSlideIndex: 5, eligibleSlideIds: ["revenue", "sales", "technicians", "operations", "recognition"] }, slides);
  assert.equal(normalized.activeSlideId, "revenue");
  assert.equal(normalized.activeSlideIndex, 0);
  const eligible = normalized.eligibleSlideIds.map((id) => ({ ...slides.find((slide) => slide.id === id), index: slides.findIndex((slide) => slide.id === id) }));
  assert.deepEqual(resolveActiveEligibleSlide(eligible, normalized.activeSlideId, normalized.activeSlideIndex), { slide: eligible[0], position: 0, count: 5 });
  assert.match(read("apps/dashboard/src/components/SlideDeck.jsx"), /Slide \{selection\.position \+ 1\} of \{selection\.count\}/);
  const restored = normalizePresentationSelection({ activeSlideIndex: 5, activeSlideId: "spreadsheet", eligibleSlideIds: slides.map(({ id }) => id) }, slides);
  assert.equal(restored.activeSlideId, "spreadsheet");
  assert.equal(restored.activeSlideIndex, 5);
});

test("TV viewport diagnostics are hidden by default", () => {
  const app = read("apps/dashboard/src/App.jsx");
  const stage = read("apps/dashboard/src/components/DisplayStage.jsx");
  assert.match(app, /viewportDiagnosticsVisible, setViewportDiagnosticsVisible\] = useState\(false\)/);
  assert.match(stage, /diagnosticsVisible = false/);
  assert.match(stage, /diagnosticsVisible && <pre className="display-stage-diagnostics"/);
});

test("Controls toggles Show Diagnostics and Hide Diagnostics locally", () => {
  const app = read("apps/dashboard/src/App.jsx");
  const controls = read("apps/dashboard/src/components/LocalDashboardControls.jsx");
  assert.match(app, /setViewportDiagnosticsVisible\(\(visible\) => !visible\)/);
  assert.match(controls, /diagnosticsVisible \? "Hide Diagnostics" : "Show Diagnostics"/);
  assert.match(controls, /onClick=\{onToggleDiagnostics\}/);
  assert.match(controls, /aria-pressed=\{diagnosticsVisible\}/);
});

test("display stage is scoped to dashboard routes and leaves the phone remote unwrapped", () => {
  const app = read("apps/dashboard/src/App.jsx");
  const stage = read("apps/dashboard/src/components/DisplayStage.jsx");
  const controls = read("apps/dashboard/src/components/LocalDashboardControls.jsx");
  const css = read("apps/dashboard/src/display-stage.css");
  const remote = read("apps/dashboard/src/components/RemoteControlPage.jsx");
  assert.match(app, /<DisplayStage diagnosticsVisible=\{viewportDiagnosticsVisible\}>\{content\}<\/DisplayStage>/);
  assert.ok(app.indexOf('route.type === "remote"') < app.indexOf("<DashboardPage"));
  assert.match(stage, /ResizeObserver/);
  assert.match(stage, /visualViewport/);
  for (const label of ["window.innerWidth", "window.innerHeight", "document.documentElement.clientWidth", "document.documentElement.clientHeight", "screen.width", "screen.height", "window.devicePixelRatio", "visualViewport.width", "visualViewport.height", "visualViewport.scale", "DisplayStage scale", "rendered width", "rendered height", "userAgent"]) assert.match(stage, new RegExp(label.replaceAll(".", "\\.")));
  assert.match(stage, /console\.info\("\[GRMetro DisplayStage diagnostics\]"/);
  assert.match(controls, /Diagnostics controls/);
  assert.match(css, /\.display-stage > \.app-shell/);
  assert.match(css, /\.display-stage-diagnostics/);
  assert.match(css, /width: 1920px/);
  assert.match(css, /height: 1080px/);
  assert.doesNotMatch(remote, /DisplayStage|display-stage-active|display-viewport/);
});
