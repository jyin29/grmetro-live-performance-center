"use strict";

const { after, before, test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");

let server; let React; let renderToStaticMarkup; let ManagementAttention; let LocalDashboardControls;
const source = (relative) => readFileSync(new URL(`../${relative}`, `file://${__filename}`), "utf8");

before(async () => {
  const { createServer } = await import("vite"); React = await import("react"); ({ renderToStaticMarkup } = await import("react-dom/server"));
  server = await createServer({ root: "apps/dashboard", server: { middlewareMode: true }, appType: "custom", logLevel: "silent" });
  ({ ManagementAttention } = await server.ssrLoadModule("/src/components/ManagementAttention.jsx"));
  ({ LocalDashboardControls } = await server.ssrLoadModule("/src/components/LocalDashboardControls.jsx"));
});
after(async () => server?.close());

test("management warnings have individual dismiss controls and material changes create new identities", async () => {
  const { managementNotificationKey, visibleManagementNotifications } = await import("../apps/dashboard/src/lib/managementNotifications.js");
  const warning = { id: "data-quality", priority: "warning", eyebrow: "Data quality", title: "Billable calls need review", detail: "Fallback value" };
  const second = { ...warning, id: "feed-stale", title: "Dashboard data is delayed" };
  const key = managementNotificationKey(warning);
  assert.equal(managementNotificationKey({ ...warning }), key);
  assert.notEqual(managementNotificationKey({ ...warning, detail: "A materially new detail" }), key);
  assert.deepEqual(visibleManagementNotifications([warning, second], new Set([key])), [second]);
  const markup = renderToStaticMarkup(React.createElement(ManagementAttention, { insights: [warning, second], onDismiss() {} }));
  assert.match(markup, /aria-label="Dismiss Billable calls need review"/);
  assert.match(markup, /aria-label="Dismiss Dashboard data is delayed"/);
});

test("dismissal reset and per-display launcher restoration are exposed without changing remote controls", () => {
  const settings = source("apps/dashboard/src/components/DismissedNotificationsSettings.jsx");
  const localControls = source("apps/dashboard/src/components/LocalDashboardControls.jsx");
  const displays = source("apps/dashboard/src/components/remote/DisplaysTab.jsx");
  assert.match(settings, /Dismissed Notifications/);
  assert.match(settings, /Restore All Notifications/);
  assert.match(localControls, /Show Controls Launcher/);
  assert.match(localControls, /if \(!launcherVisible\) return null/);
  assert.match(localControls, /Press C to reopen Controls/);
  assert.match(displays, /Show TV Controls Launcher/);
  assert.match(displays, /Restore local access on this display/);
  for (const action of ["previousSlide", "nextSlide", "pauseRotation", "resumeRotation"]) assert.match(displays, new RegExp(`controller\\.${action}`));
});

test("the TV controls launcher defaults visible and can be removed without removing keyboard recovery", () => {
  const controller = { slides: [], displayName: "Warehouse", activeSlide: null, connectionState: "connected" };
  const visible = renderToStaticMarkup(React.createElement(LocalDashboardControls, { controller }));
  const hidden = renderToStaticMarkup(React.createElement(LocalDashboardControls, { controller, launcherVisible: false }));
  assert.match(visible, /Open dashboard controls/);
  assert.equal(hidden, "");
  assert.match(source("apps/dashboard/src/components/LocalDashboardControls.jsx"), /event\.key\.toLowerCase\(\) === "c"/);
  assert.match(source("apps/dashboard/src/components/DashboardLayout.jsx"), /dismissals\.loaded[\s\S]*visibleManagementNotifications/);
});

test("portable packaging carries feature code while excluding persisted operator state", () => {
  const manifest = JSON.parse(source("scripts/windows/package-manifest.json"));
  for (const required of [
    "apps/backend/src/settings/managementDismissalStore.js",
    "apps/dashboard/src/components/DismissedNotificationsSettings.jsx",
    "apps/dashboard/src/hooks/useManagementDismissals.js",
    "apps/dashboard/src/lib/managementNotifications.js",
  ]) assert.ok(manifest.files.includes(required), `missing packaged source: ${required}`);
  assert.ok(!manifest.files.some((file) => /management-dismissals\.json$/i.test(file)));
});
