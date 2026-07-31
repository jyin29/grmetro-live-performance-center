"use strict";

const express = require("express");
const { isValidKpiId, isValidTechnicianId, isValidTvId } = require("../../../../shared/validation");
const { ApiError } = require("../http/apiError");

const ALLOWED_OVERRIDE_FIELDS = new Set(["technicianId", "kpiId"]);

function formatTv(state, now) {
  const remainingSeconds = state.mode === "remote" && state.expiresAt
    ? Math.max(0, Math.ceil((new Date(state.expiresAt).getTime() - now.getTime()) / 1000))
    : null;
  return { ...state, remainingSeconds };
}

function validateTv(tvManager, tvId) {
  if (!isValidTvId(tvId)) throw new ApiError(404, "INVALID_TV_ID", "The requested television does not exist.");
  try { return tvManager.getTelevision(tvId); }
  catch { throw new ApiError(404, "INVALID_TV_ID", "The requested television does not exist."); }
}

function validateOverride(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new ApiError(400, "INVALID_OVERRIDE", "The override must be a JSON object.");
  const unsupported = Object.keys(body).filter((field) => !ALLOWED_OVERRIDE_FIELDS.has(field));
  if (unsupported.length) throw new ApiError(400, "INVALID_OVERRIDE", "The override contains unsupported fields.", { fields: unsupported });
  const hasTechnician = body.technicianId !== undefined && body.technicianId !== null;
  const hasKpi = body.kpiId !== undefined && body.kpiId !== null;
  if (!hasTechnician && !hasKpi) throw new ApiError(400, "NO_SELECTION", "Select at least one technician or KPI.");
  if (hasTechnician && !isValidTechnicianId(body.technicianId)) throw new ApiError(400, "INVALID_TECHNICIAN_ID", "The requested technician does not exist.");
  if (hasKpi && !isValidKpiId(body.kpiId)) throw new ApiError(400, "INVALID_KPI_ID", "The requested KPI does not exist.");
  return { hasTechnician, hasKpi };
}

function createTvRoutes({ tvManager, rateLimiter, clock = () => new Date() }) {
  if (!tvManager || typeof tvManager.getTelevisions !== "function") throw new TypeError("TV routes require a TV manager.");
  const router = express.Router();
  router.get("/", (request, response) => response.json({ tvs: tvManager.getTelevisions().map((state) => formatTv(state, clock())) }));
  router.get("/:tvId", (request, response, next) => {
    try { response.json(formatTv(validateTv(tvManager, request.params.tvId), clock())); } catch (error) { next(error); }
  });
  router.post("/:tvId/override", rateLimiter, (request, response, next) => {
    try {
      validateTv(tvManager, request.params.tvId);
      const selection = validateOverride(request.body);
      const state = selection.hasTechnician && selection.hasKpi
        ? tvManager.overrideTechnicianKpi(request.params.tvId, request.body)
        : selection.hasTechnician
          ? tvManager.overrideTechnician(request.params.tvId, { technicianId: request.body.technicianId })
          : tvManager.overrideKpi(request.params.tvId, { kpiId: request.body.kpiId });
      response.json({ ok: true, tv: formatTv(state, clock()) });
    } catch (error) { next(error); }
  });
  router.post("/:tvId/resume", rateLimiter, (request, response, next) => {
    try {
      validateTv(tvManager, request.params.tvId);
      if (request.body && Object.keys(request.body).length) throw new ApiError(400, "INVALID_OVERRIDE", "The resume request does not accept fields.");
      response.json({ ok: true, tv: formatTv(tvManager.resumeLive(request.params.tvId), clock()) });
    } catch (error) { next(error); }
  });
  return router;
}

module.exports = { createTvRoutes, formatTv, validateOverride };
