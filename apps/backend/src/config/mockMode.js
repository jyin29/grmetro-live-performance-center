"use strict";

function parseExplicitBoolean(value, name) {
  if (value === undefined) return false;
  if (value === "true") return true;
  if (value === "false") return false;
  throw new Error(`${name} must be exactly "true" or "false".`);
}

function loadMockConfig(environment = process.env) {
  const nodeEnv = environment.NODE_ENV || "development";
  const mockMode = parseExplicitBoolean(environment.MOCK_MODE, "MOCK_MODE");
  const developmentRoutesEnabled = parseExplicitBoolean(
    environment.ENABLE_DEVELOPMENT_ROUTES,
    "ENABLE_DEVELOPMENT_ROUTES"
  );

  if (nodeEnv === "production" && mockMode) {
    throw new Error("MOCK_MODE cannot be enabled when NODE_ENV=production.");
  }
  if (nodeEnv === "production" && developmentRoutesEnabled) {
    throw new Error("Development routes cannot be enabled when NODE_ENV=production.");
  }

  return Object.freeze({ nodeEnv, mockMode, developmentRoutesEnabled });
}

module.exports = { loadMockConfig, parseExplicitBoolean };
