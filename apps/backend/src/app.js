"use strict";

const express = require("express");
const cors = require("cors");
const { requestLogger } = require("./middleware/requestLogger");
const { createRateLimiter } = require("./middleware/rateLimit");
const { errorHandler, notFound } = require("./middleware/errors");

function createApp({ config, logger }) {
  if (!config || !logger) throw new Error("createApp requires config and logger.");
  const app = express();
  app.disable("x-powered-by");
  if (!config.isProduction) app.use(cors({ origin: true, credentials: false }));
  app.use(requestLogger(logger));
  app.use(express.json({ limit: config.jsonBodyLimit, strict: true }));
  app.use("/api/remote", createRateLimiter({ windowMilliseconds: config.remoteRateLimit.windowSeconds * 1000, maxRequests: config.remoteRateLimit.maxRequests }));
  app.use(notFound);
  app.use(errorHandler({ logger, isProduction: config.isProduction }));
  return app;
}

module.exports = { createApp };
