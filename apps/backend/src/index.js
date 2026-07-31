"use strict";

const packageJson = require("../package.json");
const { createApp } = require("./app");
const { loadConfig } = require("./config");
const { createLogger } = require("./logger");
const { createRefreshProvider } = require("./providers/createRefreshProvider");
const { DashboardCache } = require("./cache/dashboardCache");
const { RefreshScheduler } = require("./refresh/refreshScheduler");
const { installGracefulShutdown } = require("./server");
const { TvManager } = require("./tv/tvManager");
const { ExpirationMonitor } = require("./tv/expirationMonitor");

function start() {
  const config = loadConfig();
  const logger = createLogger({ level: config.logLevel });
  const provider = config.mockMode ? createRefreshProvider({ config }) : null;
  const cache = new DashboardCache();
  const tvManager = new TvManager({
    overrideMilliseconds: config.remoteOverrideSeconds * 1000,
    returnTransitionMilliseconds: config.returnTransitionMilliseconds
  });
  const expirationMonitor = new ExpirationMonitor({ tvManager });
  const scheduler = provider ? new RefreshScheduler({
    provider, cache, logger,
    intervalMilliseconds: config.refreshIntervalSeconds * 1000,
    timeZone: config.timeZone
  }) : null;
  const app = createApp({ config, logger, cache, tvManager, scheduler, applicationVersion: packageJson.version });
  const server = app.listen(config.port, config.host, () => logger.info("Backend application started", {
    application: packageJson.name, version: packageJson.version, nodeEnv: config.nodeEnv,
    host: config.host, port: config.port, refreshProvider: provider ? "mock" : "live-pending"
  }));
  installGracefulShutdown({ server, logger, scheduler: { stop() { scheduler?.stop(); expirationMonitor.stop(); } } });
  expirationMonitor.start();
  if (scheduler) scheduler.start();
  else logger.warn("Refresh scheduler is inactive because the live provider is reserved for a later phase");
  return { server, cache, scheduler, tvManager, expirationMonitor };
}

if (require.main === module) start();
module.exports = { start };
