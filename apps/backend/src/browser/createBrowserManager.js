"use strict";

const { BrowserManager, createPlaywrightConnector } = require("./browserManager");

function createBrowserManagerForConfig(config, logger, connectorFactory = createPlaywrightConnector) {
  if (config.mockMode) return null;
  return new BrowserManager({ debugUrl: config.edgeDebugUrl,
    connectionTimeoutMilliseconds: config.edgeConnectionTimeoutMilliseconds,
    connector: connectorFactory(), logger });
}

module.exports = { createBrowserManagerForConfig };
