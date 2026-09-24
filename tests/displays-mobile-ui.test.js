"use strict";

const { after, before, test } = require("node:test");
const assert = require("node:assert/strict");

let server;
let React;
let renderToStaticMarkup;
let DisplaysTab;

const slides = [
  { id: "revenue", label: "Revenue" },
  { id: "sales", label: "Sales" },
  { id: "technicians", label: "Technicians" },
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
