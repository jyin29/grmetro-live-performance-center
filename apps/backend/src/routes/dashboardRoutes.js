"use strict";

const express = require("express");
const { ApiError } = require("../http/apiError");

function createDashboardRoutes({ cache }) {
  if (!cache || typeof cache.getPayload !== "function") throw new TypeError("Dashboard routes require a cache.");
  const router = express.Router();
  router.get("/", (request, response, next) => {
    const payload = cache.getPayload();
    if (!payload) return next(new ApiError(503, "CACHE_UNAVAILABLE", "Dashboard data is unavailable until the first successful refresh."));
    response.json(payload);
  });
  return router;
}

module.exports = { createDashboardRoutes };
