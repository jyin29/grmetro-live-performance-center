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
const { createBrowserManagerForConfig } = require("./browser/createBrowserManager");
const { createServiceTitanClient } = require("./servicetitan/createServiceTitanClient");

function start() {
  const config = loadConfig();
  const logger = createLogger({ level: config.logLevel });
  const browserManager = createBrowserManagerForConfig(config, logger);
  const serviceTitanClient = browserManager ? createServiceTitanClient({ config, browserManager, logger }) : null;
  const provider = createRefreshProvider({ config, browserManager, executor: serviceTitanClient?.executor, logger });
  const cache = new DashboardCache({ snapshotRetentionLimit: config.snapshotRetentionLimit,
    trendMinimumHistory: config.trendMinimumHistory });
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
  const mockBrowserStatus = () => ({ connected: false, connecting: false, serviceTitanPageFound: false,
    inactiveReason: "mock-mode", lastConnectedAt: null, lastDisconnectedAt: null, reconnectAttempt: 0,
    lastErrorCode: null, lastErrorMessage: null });
  const app = createApp({ config, logger, cache, tvManager, scheduler, applicationVersion: packageJson.version,
    browserStatusProvider: browserManager ? () => browserManager.getStatus() : mockBrowserStatus,
    serviceTitanStatusProvider: serviceTitanClient ? () => serviceTitanClient.getStatus() : () => ({ status: "bypassed" }), serviceTitanClient });
  const server = app.listen(config.port, config.host, () => logger.info("Backend application started", {
    application: packageJson.name, version: packageJson.version, nodeEnv: config.nodeEnv,
    host: config.host, port: config.port, refreshProvider: config.mockMode ? "mock" : "servicetitan"
  }));
  installGracefulShutdown({ server, logger, scheduler: { stop() { scheduler?.stop(); expirationMonitor.stop(); serviceTitanClient?.stop(); browserManager?.stop(); } } });
  expirationMonitor.start();
  browserManager?.start();
  scheduler.start();
  return { server, cache, scheduler, tvManager, expirationMonitor, browserManager, serviceTitanClient };
}

if (require.main === module) start();
module.exports = { start };
