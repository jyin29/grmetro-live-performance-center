"use strict";

const { assertRefreshProvider } = require("./refreshProvider");
const { MockRefreshProvider } = require("./mockRefreshProvider");
const { ServiceTitanRefreshProvider } = require("./serviceTitanRefreshProvider");

function createRefreshProvider({ config, scenario, browserManager, executor, logger, goalsProvider } = {}) {
  if (!config) throw new Error("Refresh provider configuration is required.");
  if (config.mockMode) return assertRefreshProvider(new MockRefreshProvider({ config, scenario, goalsProvider }));
  if (!browserManager || !executor) throw new Error("Live mode requires the Edge browser manager and ServiceTitan request executor; mock data will not be used as a fallback.");
  return assertRefreshProvider(new ServiceTitanRefreshProvider({ config, browserManager, executor, logger, goalsProvider }));
}

module.exports = { createRefreshProvider };
