"use strict";

const { after, before, test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");

const displaysCss = readFileSync(new URL("../apps/dashboard/src/remote-displays.css", `file://${__filename}`), "utf8");

let server;
let React;
let renderToStaticMarkup;
let DisplaysTab;
let DashboardSlideButtons;

const slides = [
  { id: "revenue", label: "Revenue", index: 0 },
  { id: "sales", label: "Sales", index: 1 },
  { id: "technicians", label: "Technicians", index: 2 },
];

const admin = {
  displays: [
    {
      displayId: "main-office",
      displayName: "Main Office",
      displayOnline: true,
      activeSlideIndex: 1,
      currentSlide: slides[1],
      connectedClients: { displays: 1, remotes: 2, total: 3 },
      acknowledgement: { applied: true, appliedRevision: 177, targetRevision: 177 },
      runtimeHealth: {
        memoryPercent: 42,
        memoryPressure: false,
        uptimeSeconds: 17_640,
        lastHeartbeatAt: new Date(Date.now() - 2_000).toISOString(),
        relaunchCount: 1,
        lastRelaunchReason: "scheduled-long-runtime-refresh",
      },
    },
    {
      displayId: "dispatch",
      displayName: "Dispatch",
      displayOnline: false,
      activeSlideIndex: 0,
      currentSlide: slides[0],
      connectedClients: { displays: 0, remotes: 0, total: 0 },
    },
  ],
};

function controller(overrides = {}) {
  return {
    displayName: "Main Office",
    activeSlideIndex: 1,
    activeSlideId: "sales",
    activeSlide: slides[1],
    slides,
    isRunning: true,
    previousSlide() {},
    nextSlide() {},
    pauseRotation() {},
    resumeRotation() {},
    restartRotationTimer() {},
    selectSlide() {},
    ...overrides,
  };
}

before(async () => {
  const { createServer } = await import("vite");
  React = await import("react");
  ({ renderToStaticMarkup } = await import("react-dom/server"));
  server = await createServer({ root: "apps/dashboard", server: { middlewareMode: true }, appType: "custom", logLevel: "silent" });
  ({ DisplaysTab } = await server.ssrLoadModule("/src/components/remote/DisplaysTab.jsx"));
  ({ DashboardSlideButtons } = await server.ssrLoadModule("/src/components/LocalDashboardControls.jsx"));
});

after(async () => server?.close());

test("Displays hierarchy presents operator state before runtime diagnostics and controls", () => {
  const markup = renderToStaticMarkup(React.createElement(DisplaysTab, {
    admin,
    controller: controller(),
    selectedDisplayId: "main-office",
    onSelectDisplay() {},
    onCustomize() {},
  }));

  for (const value of ["Main Office", "Dispatch", "Sales", "Selected display", "Connected", "Current Slide", "Rotation", "Memory Usage", "Session Uptime", "Last Heartbeat", "Reloads", "Last Recovery", "Previous", "Next", "Pause", "Resume", "Advanced Controls"]) {
    assert.match(markup, new RegExp(value));
  }
  assert.ok(markup.indexOf("Current Slide") < markup.indexOf("Memory Usage"));
  assert.ok(markup.indexOf("Memory Usage") < markup.indexOf("Control this display"));
  assert.ok(markup.indexOf("Advanced Controls") < markup.indexOf("Command acknowledgement"));
  assert.match(markup, /role="progressbar"[^>]*aria-valuenow="42"/);
  assert.match(markup, /aria-label="Resume rotation" disabled=""/);
  assert.doesNotMatch(markup, /aria-label="Pause rotation" disabled=""/);
});

test("Displays selector and hero preserve explicit offline state", () => {
  const markup = renderToStaticMarkup(React.createElement(DisplaysTab, {
    admin,
    controller: controller({ displayName: "Dispatch", activeSlideIndex: 0, activeSlide: slides[0], isRunning: false }),
    selectedDisplayId: "dispatch",
    onSelectDisplay() {},
    onCustomize() {},
  }));

  assert.match(markup, /is-display-offline/);
  assert.match(markup, /display-connection-pill is-disconnected/);
  assert.match(markup, /Disconnected/);
  assert.match(markup, /aria-label="Pause rotation" disabled=""/);
  assert.doesNotMatch(markup, /aria-label="Resume rotation" disabled=""/);
});

test("Current Slide uses balanced two-line wrapping without arbitrary word breaks", () => {
  for (const label of ["Technicians", "Recognition", "Operations"]) {
    const markup = renderToStaticMarkup(React.createElement(DisplaysTab, {
      admin,
      controller: controller({ activeSlideIndex: 2, activeSlide: { id: label.toLowerCase(), label, index: 2 } }),
      selectedDisplayId: "main-office",
      onSelectDisplay() {},
      onCustomize() {},
    }));
    assert.match(markup, /display-metric-card is-slide-name/);
    assert.match(markup, new RegExp(`>${label}<`));
  }
  assert.match(displaysCss, /\.display-metric-card\.is-slide-name > strong/);
  assert.match(displaysCss, /overflow-wrap:\s*normal/);
  assert.match(displaysCss, /word-break:\s*normal/);
  assert.match(displaysCss, /text-wrap:\s*balance/);
  assert.match(displaysCss, /-webkit-line-clamp:\s*2/);
});

test("remote and local controls highlight the stable first slide ID after wrap", () => {
  const wrapped = controller({ activeSlideIndex: 0, activeSlideId: "revenue", activeSlide: slides[0] });
  const remoteMarkup = renderToStaticMarkup(React.createElement(DisplaysTab, {
    admin,
    controller: wrapped,
    selectedDisplayId: "main-office",
    onSelectDisplay() {},
    onCustomize() {},
  }));
  const localMarkup = renderToStaticMarkup(React.createElement(DashboardSlideButtons, { controller: wrapped }));
  assert.match(remoteMarkup, /class="is-active"[^>]*aria-pressed="true"[^>]*><small>1<\/small><span>Revenue<\/span>/);
  assert.match(localMarkup, /class="is-active"[^>]*aria-pressed="true"[^>]*>Revenue<\/button>/);
  assert.doesNotMatch(remoteMarkup, /class="is-active"[^>]*><small>[2-6]<\/small>/);
});

test("six-slide state highlights Spreadsheet by stable ID when it becomes available", () => {
  const availableSlides = [...slides, { id: "operations", label: "Operations", index: 3 }, { id: "recognition", label: "Recognition", index: 4 }, { id: "spreadsheet", label: "Spreadsheet", index: 5 }];
  const available = controller({ activeSlideIndex: 5, activeSlideId: "spreadsheet", activeSlide: availableSlides[5], slides: availableSlides });
  const remoteMarkup = renderToStaticMarkup(React.createElement(DisplaysTab, {
    admin,
    controller: available,
    selectedDisplayId: "main-office",
    onSelectDisplay() {},
    onCustomize() {},
  }));
  const localMarkup = renderToStaticMarkup(React.createElement(DashboardSlideButtons, { controller: available }));
  assert.match(remoteMarkup, /class="is-active"[^>]*aria-pressed="true"[^>]*><small>6<\/small><span>Spreadsheet<\/span>/);
  assert.match(localMarkup, /class="is-active"[^>]*aria-pressed="true"[^>]*>Spreadsheet<\/button>/);
});
