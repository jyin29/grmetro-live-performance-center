"use strict";

const express = require("express");

function safeStatus(provider, fallback) {
  if (typeof provider !== "function") return fallback;
  const value = provider();
  return value && typeof value === "object" ? value : fallback;
}

function createHealthRoutes({ cache, applicationVersion, browserStatusProvider, serviceTitanStatusProvider, clock = () => new Date() }) {
  if (!cache || typeof cache.getState !== "function") throw new TypeError("Health routes require a cache.");
  const router = express.Router();
  router.get("/", (request, response) => {
    const cacheState = cache.getState(clock());
    const payloadStatus = cacheState.payload?.status;
    const browser = safeStatus(browserStatusProvider, { connected: payloadStatus?.browser === "connected" });
    const serviceTitan = safeStatus(serviceTitanStatusProvider, { status: payloadStatus?.serviceTitan || "unavailable" });
    response.json({
      status: "ok",
      backend: "running",
      version: applicationVersion,
      browser: { connected: browser.connected === true, ...(typeof browser.serviceTitanPageFound === "boolean" ? { serviceTitanPageFound: browser.serviceTitanPageFound } : {}) },
      serviceTitan: { status: typeof serviceTitan.status === "string" ? serviceTitan.status : "unavailable", ...(serviceTitan.lastSuccessfulRequestAt ? { lastSuccessfulRequestAt: serviceTitan.lastSuccessfulRequestAt } : {}) },
      cache: {
        available: cacheState.available,
        ageSeconds: cacheState.cacheAgeMilliseconds === null ? null : Math.floor(cacheState.cacheAgeMilliseconds / 1000),
        lastSuccessfulRefreshAt: cacheState.lastSuccessfulRefreshAt,
        ...(Number.isSafeInteger(payloadStatus?.staleTechnicianCount) ? { staleTechnicianCount: payloadStatus.staleTechnicianCount } : {})
      }
    });
  });
  return router;
}

module.exports = { createHealthRoutes };
