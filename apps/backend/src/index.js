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
const { PRESENTATION_DISPLAYS, PRESENTATION_SLIDE_COUNT, PRESENTATION_ROTATION_MILLISECONDS } = require("../../../shared/presentation");
const { createPresentationManager } = require("./presentation/presentationManager");
const { createPresentationCommandBus } = require("./presentation/presentationCommandBus");
const { createPresentationWebSocket } = require("./presentation/presentationWebSocket");
const { createEventEngine } = require("./events/eventEngine");

function start() {
  const startedAt = new Date();
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
  const eventEngine = createEventEngine();
  const presentationManager = createPresentationManager({ displays: PRESENTATION_DISPLAYS,
    slideCount: PRESENTATION_SLIDE_COUNT, rotationMilliseconds: PRESENTATION_ROTATION_MILLISECONDS, eventEngine });
  const presentationCommandBus = createPresentationCommandBus({ handleCommand: presentationManager.handleCommand });
  const scheduler = provider ? new RefreshScheduler({
    provider, cache, logger,
    intervalMilliseconds: config.refreshIntervalSeconds * 1000,
    timeZone: config.timeZone, onSuccessfulPayload: (payload) => eventEngine.process(payload)
  }) : null;
  const mockBrowserStatus = () => ({ connected: false, connecting: false, serviceTitanPageFound: false,
    inactiveReason: "mock-mode", lastConnectedAt: null, lastDisconnectedAt: null, reconnectAttempt: 0,
    lastErrorCode: null, lastErrorMessage: null });
  let presentationWebSocket;
  const app = createApp({ config, logger, cache, tvManager, scheduler, applicationVersion: packageJson.version,
    buildVersion: process.env.BUILD_VERSION || null,
    browserStatusProvider: browserManager ? () => browserManager.getStatus() : mockBrowserStatus,
    serviceTitanStatusProvider: serviceTitanClient ? () => serviceTitanClient.getStatus() : () => ({ status: "bypassed" }), serviceTitanClient,
    adminRuntime: { presentationManager, eventEngine, startedAt,
      connectionStatusProvider: () => presentationWebSocket?.getConnectionSummary() || { total: 0, displays: 0, remotes: 0 } } });
  const server = app.listen(config.port, config.host, () => logger.info("Backend application started", {
    application: packageJson.name, version: packageJson.version, nodeEnv: config.nodeEnv,
    host: config.host, port: config.port, refreshProvider: config.mockMode ? "mock" : "servicetitan"
  }));
  presentationWebSocket = createPresentationWebSocket({ server, manager: presentationManager, commandBus: presentationCommandBus, logger });
  installGracefulShutdown({ server, logger, scheduler: { stop() { scheduler?.stop(); expirationMonitor.stop(); presentationWebSocket.close(); presentationManager.destroy(); eventEngine.destroy(); serviceTitanClient?.stop(); browserManager?.stop(); } } });
  expirationMonitor.start();
  browserManager?.start();
  scheduler.start();
  return { server, cache, scheduler, tvManager, expirationMonitor, browserManager, serviceTitanClient,
    presentationManager, presentationWebSocket, eventEngine };
}

if (require.main === module) start();
module.exports = { start };
