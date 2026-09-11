const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");

function source(path) {
  return readFileSync(new URL(`../${path}`, `file://${__filename}`), "utf8");
}

test("healthy display avoids duplicate presence heartbeat ownership", () => {
  const app = source("apps/dashboard/src/App.jsx");
  assert.match(app, /Once DashboardLayout mounts/);
  assert.match(app, /return <DashboardLayout/);
  assert.doesNotMatch(app, /return <>\s*<DisplayPresenceReporter[^>]*\/>\s*<DashboardLayout/);
});

test("healthy display transport uses a slower HTTP safety poll while websocket is connected", () => {
  const controller = source("apps/dashboard/src/controller/PresentationController.jsx");
  assert.match(controller, /DISPLAY_CONNECTED_POLL_MS=15000/);
  assert.match(controller, /clientType==="display"&&transportState==="connected"\?DISPLAY_CONNECTED_POLL_MS:POLL_MS/);
  assert.match(controller, /MEMORY_PRESSURE_RATIO=\.80/);
  assert.match(controller, /RECOVERY_CACHE_MS=30000/);
});

test("large dashboard and customization payloads do not force constant rerenders", () => {
  const dashboard = source("apps/dashboard/src/hooks/useDashboard.js");
  const settings = source("apps/dashboard/src/hooks/useDisplaySettings.js");
  const spreadsheet = source("apps/dashboard/src/hooks/useSpreadsheetSlide.js");
  assert.match(dashboard, /POLL_INTERVAL_MS = 15_000/);
  assert.match(dashboard, /versionRef\.current === version/);
  assert.match(dashboard, /return current/);
  assert.match(settings, /POLL_MS = 30_000/);
  assert.match(settings, /serializedRef\.current === serialized/);
  assert.match(spreadsheet, /POLL_MS = 30_000/);
  assert.match(spreadsheet, /serializedRef\.current === serialized/);
});

test("long-running rendering reuses expensive Intl formatters", () => {
  const presentation = source("apps/dashboard/src/lib/presentation.js");
  const header = source("apps/dashboard/src/components/Header.jsx");
  assert.match(presentation, /const CURRENCY_FORMATTER = new Intl\.NumberFormat/);
  assert.match(presentation, /const CLOCK_FORMATTER = new Intl\.DateTimeFormat/);
  assert.match(presentation, /return CLOCK_FORMATTER\.format\(now\)/);
  assert.match(header, /const REFRESH_TIME_FORMATTER = new Intl\.DateTimeFormat/);
  assert.match(header, /REFRESH_TIME_FORMATTER\.format\(refreshedDate\)/);
});

test("measured highlight observer releases detached DOM targets", () => {
  const highlights = source("apps/dashboard/src/measuredSlidingHighlights.js");
  assert.match(highlights, /const observedTargets = new Set\(\)/);
  assert.match(highlights, /resizeObserver\.unobserve\(target\)/);
  assert.match(highlights, /observedTargets\.delete\(target\)/);
  assert.match(highlights, /releaseDetachedTargets\(\)/);
});

test("automatic memory recovery is scoped to physical display routes", () => {
  const recovery = source("apps/dashboard/src/runtime/kioskRecovery.js");
  assert.match(recovery, /path!=="\/remote"&&path!=="\/admin"&&path!=="\/customize"/);
  assert.match(recovery, /!isDisplayRoute\(\)/);
  assert.match(recovery, /lastPlannedReload/);
});
