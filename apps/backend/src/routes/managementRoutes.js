"use strict";

const express = require("express");

function createManagementRoutes({ scheduler, goalStore, rateLimiter, clock = () => new Date() } = {}) {
  if (!scheduler?.refresh) throw new TypeError("Management routes require the dashboard refresh scheduler.");
  const router = express.Router();
  let status = { state: "idle", message: "Ready to refresh", startedAt: null, completedAt: null };

  router.get("/refresh", (request, response) => response.json(status));
  if (goalStore) {
    router.get("/goals", (request, response) => response.json(goalStore.getPublicState()));
    router.put("/goals", rateLimiter, async (request, response, next) => {
      try {
        const result = goalStore.save(request.body);
        const refresh = await scheduler.refresh("goal-update");
        if (!refresh?.ok) return response.status(503).json({ message: "Goals were saved, but the dashboard refresh failed.", ...result });
        return response.json({ message: "Goals saved and synchronized.", ...result });
      } catch (error) { return next(error); }
    });
  }
  router.post("/refresh", rateLimiter, async (request, response) => {
    if (status.state === "refreshing" || scheduler.active) {
      return response.status(409).json({ ...status, state: "refreshing", message: "A dashboard refresh is already running." });
    }
    const startedAt = clock().toISOString();
    status = { state: "refreshing", message: "Refreshing dashboard data…", startedAt, completedAt: null };
    try {
      const result = await scheduler.refresh("remote-management");
      const completedAt = clock().toISOString();
      if (!result?.ok) {
        status = { state: "failed", message: "Dashboard refresh failed. The last successful data remains visible.", startedAt, completedAt };
        return response.status(503).json(status);
      }
      status = { state: "succeeded", message: "Dashboard refresh completed successfully.", startedAt, completedAt };
      return response.json(status);
    } catch {
      status = { state: "failed", message: "Dashboard refresh failed. The last successful data remains visible.", startedAt, completedAt: clock().toISOString() };
      return response.status(503).json(status);
    }
  });
  return router;
}

module.exports = { createManagementRoutes };
