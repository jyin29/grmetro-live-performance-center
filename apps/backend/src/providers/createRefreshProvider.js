"use strict";

const { assertRefreshProvider } = require("./refreshProvider");
const { MockRefreshProvider } = require("./mockRefreshProvider");

function createRefreshProvider({ config, scenario } = {}) {
  if (!config) throw new Error("Refresh provider configuration is required.");
  if (!config.mockMode) {
    throw new Error("Live refresh provider is not implemented; mock data will not be used as a fallback.");
  }
  return assertRefreshProvider(new MockRefreshProvider({ config, scenario }));
}

module.exports = { createRefreshProvider };
