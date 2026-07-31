"use strict";

function assertRefreshProvider(provider) {
  if (!provider || typeof provider.refresh !== "function") {
    throw new TypeError("A refresh provider must expose refresh({ now }).");
  }
  return provider;
}

module.exports = { assertRefreshProvider };
