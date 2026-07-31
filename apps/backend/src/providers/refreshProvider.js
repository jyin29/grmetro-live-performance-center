"use strict";

function assertRefreshProvider(provider) {
  if (!provider || typeof provider.refresh !== "function") {
    throw new TypeError("A refresh provider must expose refresh({ now }).");
  }
  return provider;
}

function safeRefreshDiagnostic(error) {
  const allowedCodes = new Set(["AUTHENTICATION_REQUIRED", "BROWSER_DISCONNECTED", "REQUEST_TIMEOUT", "INVALID_RESPONSE", "REFRESH_FAILED"]);
  return Object.freeze({
    code: allowedCodes.has(error?.code) ? error.code : "REFRESH_FAILED",
    retryable: error?.retryable !== false
  });
}

module.exports = { assertRefreshProvider, safeRefreshDiagnostic };
