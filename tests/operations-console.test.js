const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");

const source = readFileSync(new URL("../apps/dashboard/src/components/RemoteControlPage.jsx", `file://${__filename}`), "utf8");

test("operations console defines accessible mobile bottom navigation", () => {
  for (const [id, tab] of [["home", "Home"], ["technicians", "Technicians"], ["displays", "Displays"], ["settings", "Settings"]]) assert.match(source, new RegExp(`\\[\\"${id}\\", \\"${tab}\\"\\]`));
  assert.match(source, /aria-label="Primary navigation"/);
  assert.match(source, /aria-current=\{activeTab === id \? "page"/);
});

test("operations console receives live dashboard, administration, and presentation updates", () => {
  assert.match(source, /useDashboard\(\)/);
  assert.match(source, /window\.setInterval\(load, ADMIN_POLL_MS\)/);
  assert.match(source, /usePresentationController\(selectedDisplayId, "remote"\)/);
});

test("display controls remain scoped to the selected display", () => {
  for (const action of ["pauseRotation", "resumeRotation", "restartRotationTimer", "selectSlide"]) assert.match(source, new RegExp(`controller\\.${action}`));
  assert.match(source, /onSelectDisplay\(display\.displayId\)/);
  assert.match(source, /Refresh Dashboard/);
});

test("technician search and stable selection drive the expanded drilldown", async () => {
  const { resolveSelectedTechnician } = await import("../apps/dashboard/src/lib/technicianDetail.js");
  const technicians = [{ id: 1, name: "Alpha" }, { id: 2, name: "Bravo" }];
  assert.equal(resolveSelectedTechnician(technicians, 2).name, "Bravo");
  assert.equal(resolveSelectedTechnician(technicians, 99).name, "Alpha");
  assert.match(source, /type="search"/);
  assert.match(source, /<TechnicianDetail/);
});

test("management and diagnostics remain available inside settings", () => {
  for (const heading of ["Recent Events", "Current Alerts", "Achievements", "Business Rule Results"]) assert.match(source, new RegExp(heading));
  assert.match(source, /Business Rules &amp; Administration/);
  for (const label of ["Backend", "Dashboard", "Presentation", "Display Manager", "WebSocket", "Refresh Scheduler", "Watchdog", "Kiosk Mode", "Connection Quality", "Reconnect Count", "Build Version", "Application Version"]) assert.match(source, new RegExp(label));
});
