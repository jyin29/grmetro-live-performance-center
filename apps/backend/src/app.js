"use strict";

const path = require("node:path");
const fs = require("node:fs");
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
const { createPresentationRoutes } = require("./routes/presentationRoutes");

const DASHBOARD_CLIENT_ROUTES = new Set(["/", "/display", "/remote", "/admin", "/customize"]);
function installDashboardStaticRoutes(app) {
  const dashboardDist = path.resolve(__dirname, "../../dashboard/dist");
  const indexFile = path.join(dashboardDist, "index.html");
  if (!fs.existsSync(indexFile)) return false;
  app.use(express.static(dashboardDist, { index: false, maxAge: "1h", immutable: true }));
  const serveDashboard = (_request, response) => {
    response.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    response.set("Pragma", "no-cache");
    response.set("Expires", "0");
    return response.sendFile(indexFile);
  };
  // Match the parsed pathname ourselves. This deliberately ignores the query string,
  // so paired URLs such as /remote?display=main-office always receive the SPA shell.
  app.use((request, response, next) => {
    if (request.method !== "GET") return next();
    const pathname = request.path.replace(/\/+$/, "") || "/";
    if (DASHBOARD_CLIENT_ROUTES.has(pathname) || /^\/display\/[^/]+$/.test(pathname)) return serveDashboard(request, response);
    return next();
  });
  return true;
}

function createApp({ config, logger, cache, tvManager, scheduler, applicationVersion = "1.0.0", buildVersion,
  browserStatusProvider, serviceTitanStatusProvider, serviceTitanClient, clock, adminRuntime, presentationRuntime, goalStore, displaySettingsStore, spreadsheetSlideStore }) {
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
  if (presentationRuntime) app.use("/api/v1/presentation", createPresentationRoutes(presentationRuntime));
  if (scheduler) app.use("/api/v1/management", createManagementRoutes({ scheduler, goalStore, displaySettingsStore, spreadsheetSlideStore, rateLimiter, clock }));
  if (adminRuntime) app.use("/api/v1/admin", createAdminRoutes({ cache, applicationVersion, buildVersion, clock, ...adminRuntime }));
  if (config.developmentRoutesEnabled && !config.isProduction) app.use("/api/v1/dev", createDevelopmentRoutes({ scheduler, serviceTitanClient }));
  app.use("/api", notFound);
  app.use("/ws", notFound);
  installDashboardStaticRoutes(app);
  app.use(notFound);
  app.use(errorHandler({ logger, isProduction: config.isProduction }));
  return app;
}
module.exports = { createApp, installDashboardStaticRoutes };
