const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");

const source = readFileSync(new URL("../apps/dashboard/src/components/RemoteControlPage.jsx", `file://${__filename}`), "utf8");
const displaysSource = readFileSync(new URL("../apps/dashboard/src/components/remote/DisplaysTab.jsx", `file://${__filename}`), "utf8");
const displaysCss = readFileSync(new URL("../apps/dashboard/src/remote-displays.css", `file://${__filename}`), "utf8");

test("operations console defines accessible mobile bottom navigation", () => {
  assert.match(source, /OPERATIONS_TABS = \[\["home", "Home"\], \["displays", "Displays"\], \["technicians", "Technicians"\], \["settings", "Settings"\]\]/);
  assert.match(source, /aria-label="Primary navigation"/);
  assert.match(source, /aria-current=\{activeTab === id \? "page"/);
});

test("operations console receives live dashboard, administration, and presentation updates", () => {
  assert.match(source, /useDashboard\(\)/);
  assert.match(source, /window\.setInterval\(load, ADMIN_POLL_MS\)/);
  assert.match(source, /usePresentationController\(selectedDisplayId, "remote"\)/);
});

test("display controls remain scoped to the selected display", () => {
  for (const action of ["previousSlide", "nextSlide", "pauseRotation", "resumeRotation", "restartRotationTimer", "selectSlide"]) assert.match(displaysSource, new RegExp(`controller\\.${action}`));
  assert.match(displaysSource, /onSelectDisplay\(display\.displayId\)/);
  assert.match(displaysSource, /disabled=\{!controller\.isRunning\}/);
  assert.match(displaysSource, /disabled=\{controller\.isRunning\}/);
  assert.match(source, /Refresh Dashboard/);
});

test("technician search and stable selection drive the expanded drilldown", async () => {
  const { resolveSelectedTechnician } = await import("../apps/dashboard/src/lib/technicianDetail.js");
  const technicians = [{ id: 1, name: "Alpha" }, { id: 2, name: "Bravo" }];
  assert.equal(resolveSelectedTechnician(technicians, 2).name, "Bravo");
  assert.equal(resolveSelectedTechnician(technicians, 99).name, "Alpha");
  assert.match(source, /type="search"/);
  assert.match(source, /<Icon name="search"/);
  assert.match(source, /<TechnicianDetail/);
});

test("management and diagnostics remain available inside settings", () => {
  for (const heading of ["Recent Events", "Current Alerts", "Achievements", "Business Rule Results"]) assert.match(source, new RegExp(heading));
  assert.match(source, /Business Rules &amp; Administration/);
  for (const label of ["Backend", "Dashboard", "Presentation", "Display Manager", "WebSocket", "Refresh Scheduler", "Watchdog", "Kiosk Mode", "Connection Quality", "Reconnect Count", "Build Version", "Application Version"]) assert.match(source, new RegExp(label));
});

test("display runtime health is visible from the phone console", () => {
  for (const label of ["Memory Usage", "Session Uptime", "Last Heartbeat", "Reloads", "Last Recovery"]) assert.match(displaysSource, new RegExp(label));
  for (const label of ["Display memory", "Last TV heartbeat", "Last display recovery", "Browser session"]) assert.match(source, new RegExp(label));
  assert.match(displaysSource, /runtimeHealth/);
  assert.match(displaysSource, /formatMemoryHealth/);
  assert.match(displaysSource, /formatHeartbeatAge/);
});

test("display layout keeps diagnostics subordinate and compact on phones", () => {
  assert.match(displaysSource, /<details className="display-advanced-controls">/);
  assert.match(displaysSource, /display-picker display-picker--cards/);
  assert.ok(displaysSource.indexOf("Advanced Controls") < displaysSource.indexOf("Command acknowledgement"));
  assert.doesNotMatch(displaysSource.slice(0, displaysSource.indexOf("Advanced Controls")), /Command acknowledgement/);
  assert.match(displaysCss, /\.display-status-grid,\.display-runtime-grid\s*\{[^}]*repeat\(3, minmax\(0, 1fr\)\)/);
  assert.match(displaysCss, /@media \(max-width: 380px\)/);
  assert.match(displaysCss, /\.display-primary-controls\s*\{[^}]*repeat\(2, minmax\(0, 1fr\)\)/);
});
