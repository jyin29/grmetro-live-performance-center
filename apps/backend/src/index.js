"use strict";

const packageJson = require("../package.json");
const { createApp } = require("./app");
const { loadConfig } = require("./config");
const { createLogger } = require("./logger");
const { createRefreshProvider } = require("./providers/createRefreshProvider");
const { installGracefulShutdown } = require("./server");

function start() {
  const config = loadConfig();
  const logger = createLogger({ level: config.logLevel });
  const provider = config.mockMode ? createRefreshProvider({ config }) : null;
  const app = createApp({ config, logger });
  const server = app.listen(config.port, config.host, () => logger.info("Backend application started", {
    application: packageJson.name, version: packageJson.version, nodeEnv: config.nodeEnv,
    host: config.host, port: config.port, refreshProvider: provider ? "mock" : "live-pending"
  }));
  installGracefulShutdown({ server, logger });
  return server;
}

if (require.main === module) start();
module.exports = { start };
