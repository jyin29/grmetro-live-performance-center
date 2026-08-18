"use strict";

const express = require("express");

function createManagementRoutes({ scheduler, goalStore, displaySettingsStore, spreadsheetSlideStore, rateLimiter, clock = () => new Date() } = {}) {
  if (!scheduler?.refresh) throw new TypeError("Management routes require the dashboard refresh scheduler.");
  const router = express.Router();
  let status = { state: "idle", message: "Ready to refresh", startedAt: null, completedAt: null };

  router.get("/refresh", (request, response) => response.json(status));
  router.get("/period", (request, response) => response.json({ period: scheduler.getPeriod?.() || "today", availablePeriods: ["today", "mtd"] }));
  router.put("/period", rateLimiter, async (request, response, next) => {
    try {
      const period = String(request.body?.period || "").toLowerCase();
      if (!["today", "mtd"].includes(period)) return response.status(400).json({ message: "Period must be today or mtd." });
      if (scheduler.active) return response.status(409).json({ message: "A dashboard refresh is already running.", period: scheduler.getPeriod?.() || "today" });
      const result = await scheduler.setPeriod(period);
      if (!result?.ok) return response.status(503).json({ message: "Could not change the dashboard period. The previous period remains active.", period: scheduler.getPeriod?.() || "today" });
      return response.json({ message: period === "mtd" ? "Dashboard changed to Month to Date." : "Dashboard changed to Today.", period, dateRange: result.dateRange || null });
    } catch (error) { return next(error); }
  });
  if (goalStore) {
    router.get("/goals", (request, response) => response.json(goalStore.getPublicState()));
    router.put("/goals", rateLimiter, async (request, response, next) => {
      try {
        const result = goalStore.save(request.body);
        let refresh = await scheduler.refresh("goal-update");
        if (refresh?.skipped && refresh?.code === "REFRESH_IN_PROGRESS") {
          const deadline = Date.now() + 15_000;
          while (scheduler.active && Date.now() < deadline) await new Promise((resolve) => setTimeout(resolve, 250));
          if (!scheduler.active) refresh = await scheduler.refresh("goal-update-queued");
        }
        if (!refresh?.ok) return response.json({ message: "Goals saved. Dashboard data will apply them on the next successful refresh.", refreshPending: true, ...result });
        return response.json({ message: "Goals saved and synchronized.", refreshPending: false, ...result });
      } catch (error) { return next(error); }
    });
  }
  if (displaySettingsStore) {
    router.get("/display-settings", (request, response) => response.json(displaySettingsStore.getPublicState()));
    router.put("/display-settings", rateLimiter, (request, response, next) => {
      try { return response.json({ message: "Display settings saved.", ...displaySettingsStore.save(request.body) }); }
      catch (error) { return next(error); }
    });
  }
  if (spreadsheetSlideStore) {
    router.get("/spreadsheet-slide", (request, response) => response.json(spreadsheetSlideStore.getPublicState()));
    router.put("/spreadsheet-slide", rateLimiter, (request, response, next) => {
      try { return response.json({ message: "Spreadsheet slide saved.", ...spreadsheetSlideStore.save(request.body) }); }
      catch (error) { return next(error); }
    });
    router.delete("/spreadsheet-slide", rateLimiter, (request, response, next) => {
      try { return response.json({ message: "Spreadsheet slide removed.", ...spreadsheetSlideStore.clear() }); }
      catch (error) { return next(error); }
    });
  }
  router.post("/refresh", rateLimiter, async (request, response) => {
    if (status.state === "refreshing" || scheduler.active) return response.status(409).json({ ...status, state: "refreshing", message: "A dashboard refresh is already running." });
    const startedAt = clock().toISOString(); status = { state: "refreshing", message: "Refreshing dashboard data…", startedAt, completedAt: null };
    try {
      const result = await scheduler.refresh("remote-management"); const completedAt = clock().toISOString();
      if (!result?.ok) { status = { state: "failed", message: "Dashboard refresh failed. The last successful data remains visible.", startedAt, completedAt }; return response.status(503).json(status); }
      status = { state: "succeeded", message: "Dashboard refresh completed successfully.", startedAt, completedAt };
      return response.json({ ...status, period: result.period, dateRange: result.dateRange });
    } catch {
      status = { state: "failed", message: "Dashboard refresh failed. The last successful data remains visible.", startedAt, completedAt: clock().toISOString() };
      return response.status(503).json(status);
    }
  });
  return router;
}

module.exports = { createManagementRoutes };
