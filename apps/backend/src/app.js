"use strict";

const express = require("express");
const cors = require("cors");
const { requestLogger } = require("./middleware/requestLogger");
const { createRateLimiter } = require("./middleware/rateLimit");
const { errorHandler, notFound } = require("./middleware/errors");
const { createHealthRoutes } = require("./routes/healthRoutes");
const { createDashboardRoutes } = require("./routes/dashboardRoutes");
const { createTvRoutes } = require("./routes/tvRoutes");
const { createDevelopmentRoutes } = require("./routes/developmentRoutes");
const { createAdminRoutes } = require("./routes/adminRoutes");
const { createManagementRoutes } = require("./routes/managementRoutes");

function createApp({ config, logger, cache, tvManager, scheduler, applicationVersion = "1.0.0", buildVersion,
  browserStatusProvider, serviceTitanStatusProvider, serviceTitanClient, clock, adminRuntime }) {
  if (!config || !logger) throw new Error("createApp requires config and logger.");
  const app = express();
  app.disable("x-powered-by");
  if (!config.isProduction) app.use(cors({ origin: true, credentials: false }));
  app.use(requestLogger(logger));
  app.use(express.json({ limit: config.jsonBodyLimit, strict: true }));
  const rateLimiter = createRateLimiter({ windowMilliseconds: config.remoteRateLimit.windowSeconds * 1000, maxRequests: config.remoteRateLimit.maxRequests });
  app.use("/api/v1/health", createHealthRoutes({ cache, applicationVersion, browserStatusProvider, serviceTitanStatusProvider, clock }));
  app.use("/api/v1/dashboard", createDashboardRoutes({ cache }));
  app.use("/api/v1/tvs", createTvRoutes({ tvManager, rateLimiter, clock }));
  if (scheduler) app.use("/api/v1/management", createManagementRoutes({ scheduler, rateLimiter, clock }));
  if (adminRuntime) app.use("/api/v1/admin", createAdminRoutes({ cache, applicationVersion, buildVersion, clock, ...adminRuntime }));
  if (config.developmentRoutesEnabled && !config.isProduction) app.use("/api/v1/dev", createDevelopmentRoutes({ scheduler, serviceTitanClient }));
  app.use(notFound);
  app.use(errorHandler({ logger, isProduction: config.isProduction }));
  return app;
}

module.exports = { createApp };
