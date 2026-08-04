"use strict";

const express = require("express");
const { ApiError } = require("../http/apiError");
const technicians = require("../../../../shared/technicians");

const validTechnicianIds = new Set(technicians.map((technician) => technician.id));
function validateDrilldownBody(body) {
  const extra = Object.keys(body || {}).filter((key) => !["technicianId", "date"].includes(key));
  if (extra.length) throw new ApiError(400, "INVALID_DRILLDOWN_REQUEST", "Only technicianId and date are allowed.", { fields: extra });
  const technicianId = Number(body?.technicianId);
  if (!Number.isSafeInteger(technicianId) || !validTechnicianIds.has(technicianId)) throw new ApiError(400, "INVALID_TECHNICIAN_ID", "Technician ID is not configured for Version 1.0.");
  const date = String(body?.date || "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new ApiError(400, "INVALID_DATE", "Date must use YYYY-MM-DD format.");
  const parsed = new Date(`${date}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) throw new ApiError(400, "INVALID_DATE", "Date must be a real calendar date in YYYY-MM-DD format.");
  return { technicianId, date };
}
function createDevelopmentRoutes({ scheduler, serviceTitanClient } = {}) {
  if (!scheduler || typeof scheduler.refresh !== "function") throw new TypeError("Development routes require a scheduler.");
  const router = express.Router();
  router.post("/refresh", async (request, response, next) => {
    try {
      if (scheduler.active) throw new ApiError(409, "REFRESH_IN_PROGRESS", "A dashboard refresh is already running.");
      const result = await scheduler.refresh("development-api");
      if (result.code === "REFRESH_IN_PROGRESS") throw new ApiError(409, "REFRESH_IN_PROGRESS", "A dashboard refresh is already running.");
      response.json({ ok: result.ok, refresh: result });
    } catch (error) { next(error); }
  });
  router.post("/servicetitan/drilldown", async (request, response, next) => {
    try {
      if (!serviceTitanClient?.fetchTechnicianJobDrilldown) throw new ApiError(503, "SERVICETITAN_UNAVAILABLE", "Live ServiceTitan client is unavailable.");
      response.json({ ok: true, drilldown: await serviceTitanClient.fetchTechnicianJobDrilldown(validateDrilldownBody(request.body)) });
    } catch (error) { next(error); }
  });
  return router;
}
module.exports = { createDevelopmentRoutes, validateDrilldownBody };
