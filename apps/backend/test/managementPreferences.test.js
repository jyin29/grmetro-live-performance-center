"use strict";

const assert = require("node:assert/strict");
const express = require("express");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { createManagementRoutes } = require("../src/routes/managementRoutes");
const { DisplaySettingsStore } = require("../src/settings/displaySettingsStore");
const { ManagementDismissalStore } = require("../src/settings/managementDismissalStore");

async function run(app, action) { const server = await new Promise((resolve) => { const listener = app.listen(0, "127.0.0.1", () => resolve(listener)); }); try { return await action(`http://127.0.0.1:${server.address().port}`); } finally { await new Promise((resolve) => server.close(resolve)); } }
async function request(base, endpoint, options) { const response = await fetch(`${base}${endpoint}`, options); return { response, body: await response.json() }; }

test("display launcher preferences and notification dismissals persist through management APIs", async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "grmetro-management-preferences-"));
  try {
    const displayFile = path.join(directory, "display-settings.json");
    const dismissalFile = path.join(directory, "management-dismissals.json");
    const displaySettingsStore = new DisplaySettingsStore({ filePath: displayFile });
    const managementDismissalStore = new ManagementDismissalStore({ filePath: dismissalFile, clock: () => new Date("2026-09-28T12:00:00.000Z") });
    const app = express(); app.use(express.json()); app.use("/api/v1/management", createManagementRoutes({ scheduler: { active: false, refresh: async () => ({ ok: true }) }, displaySettingsStore, managementDismissalStore, rateLimiter: (_request, _response, next) => next() }));
    await run(app, async (base) => {
      let result = await request(base, "/api/v1/management/display-settings");
      assert.equal(result.body.settings.displayPreferences.warehouse.controlsLauncherVisible, true);
      result = await request(base, "/api/v1/management/display-settings/warehouse/controls-launcher", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ visible: false }) });
      assert.equal(result.body.settings.displayPreferences.warehouse.controlsLauncherVisible, false);
      assert.equal(result.body.settings.displayPreferences.dispatch.controlsLauncherVisible, true);
      result = await request(base, "/api/v1/management/notification-dismissals/notice-1234abcd", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: "data-quality", priority: "warning", eyebrow: "Data quality", title: "Billable calls need review", detail: "Fallback value" }) });
      assert.equal(result.body.dismissed.length, 1);
      assert.equal((await request(base, "/api/v1/management/notification-dismissals")).body.dismissed[0].key, "notice-1234abcd");
    });
    assert.equal(new DisplaySettingsStore({ filePath: displayFile }).getPublicState().settings.displayPreferences.warehouse.controlsLauncherVisible, false);
    const reloadedDismissals = new ManagementDismissalStore({ filePath: dismissalFile });
    assert.equal(reloadedDismissals.getPublicState().dismissed[0].key, "notice-1234abcd");
    const resetApp = express(); resetApp.use(express.json()); resetApp.use("/api/v1/management", createManagementRoutes({ scheduler: { active: false, refresh: async () => ({ ok: true }) }, managementDismissalStore: reloadedDismissals, rateLimiter: (_request, _response, next) => next() }));
    await run(resetApp, async (base) => {
      const result = await request(base, "/api/v1/management/notification-dismissals", { method: "DELETE" });
      assert.equal(result.body.dismissed.length, 0);
    });
    assert.equal(new ManagementDismissalStore({ filePath: dismissalFile }).getPublicState().dismissed.length, 0);
  } finally { fs.rmSync(directory, { recursive: true, force: true }); }
});
