"use strict";

const express = require("express");
const { ApiError } = require("../http/apiError");

function createDevelopmentRoutes({ scheduler }) {
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
  return router;
}

module.exports = { createDevelopmentRoutes };
