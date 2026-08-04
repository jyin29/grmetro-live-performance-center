"use strict";

function assertRefreshProvider(provider) {
  if (!provider || typeof provider.refresh !== "function") {
    throw new TypeError("A refresh provider must expose refresh({ now }).");
  }
  return provider;
}

function safeRefreshDiagnostic(error) {
  const allowedCodes = new Set(["SERVICE_TITAN_UNAVAILABLE", "SERVICE_TITAN_AUTH_REQUIRED", "SERVICE_TITAN_CSRF_ERROR", "SERVICE_TITAN_INVALID_RESPONSE", "SERVICE_TITAN_TIMEOUT", "SERVICE_TITAN_HTTP_ERROR", "SERVICE_TITAN_EMPTY_RESULT"]);
  return Object.freeze({
    code: allowedCodes.has(error?.code) ? error.code : "REFRESH_FAILED",
    retryable: error?.retryable !== false
  });
}

module.exports = { assertRefreshProvider, safeRefreshDiagnostic };
