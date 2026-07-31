"use strict";

const path = require("node:path");
const net = require("node:net");
const dotenv = require("dotenv");
const { loadMockConfig } = require("./config/mockMode");

const DEFAULTS = Object.freeze({
  NODE_ENV: "development", HOST: "127.0.0.1", PORT: "3000",
  EDGE_DEBUG_URL: "http://127.0.0.1:9222",
  EDGE_CONNECTION_TIMEOUT_MILLISECONDS: "30000",
  SERVICETITAN_BASE_URL: "https://go.servicetitan.com",
  TIMEZONE: "America/New_York", REFRESH_INTERVAL_SECONDS: "60",
  REMOTE_OVERRIDE_SECONDS: "120", RETURN_TRANSITION_MILLISECONDS: "1000",
  STALE_WARNING_SECONDS: "180", STALE_CRITICAL_SECONDS: "600",
  JSON_BODY_LIMIT: "100kb", REMOTE_RATE_LIMIT_WINDOW_SECONDS: "60",
  REMOTE_RATE_LIMIT_MAX_REQUESTS: "30", LOG_LEVEL: "info"
});

function integer(value, name, { min = 1, max = Number.MAX_SAFE_INTEGER } = {}) {
  if (!/^\d+$/.test(String(value))) throw new Error(`${name} must be an integer.`);
  const result = Number(value);
  if (!Number.isSafeInteger(result) || result < min || result > max) {
    throw new Error(`${name} must be between ${min} and ${max}.`);
  }
  return result;
}

function url(value, name, { protocols, loopbackOnly = false } = {}) {
  let parsed;
  try { parsed = new URL(value); } catch { throw new Error(`${name} must be a valid URL.`); }
  if (protocols && !protocols.includes(parsed.protocol)) throw new Error(`${name} must use ${protocols.join(" or ")}.`);
  if (parsed.username || parsed.password) throw new Error(`${name} must not contain credentials.`);
  if (loopbackOnly && !["127.0.0.1", "::1"].includes(parsed.hostname)) throw new Error(`${name} must use a loopback IP address.`);
  return parsed.origin;
}

function validateHost(value) {
  const unwrapped = value.startsWith("[") && value.endsWith("]") ? value.slice(1, -1) : value;
  const hostname = /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)*[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i;
  if (!net.isIP(unwrapped) && !hostname.test(value)) {
    throw new Error("HOST must be a hostname or IP address without a protocol or port.");
  }
  return value;
}

function validateTimeZone(value) {
  try { new Intl.DateTimeFormat("en-US", { timeZone: value }).format(); } catch { throw new Error("TIMEZONE must be a valid IANA time zone."); }
  return value;
}

function loadConfig(environment = process.env, options = {}) {
  if (options.loadEnvironmentFile !== false) {
    dotenv.config({ path: options.environmentFile || path.resolve(__dirname, "../../../.env"), quiet: true });
    environment = process.env;
  }
  const env = { ...DEFAULTS, ...environment };
  if (!["development", "test", "production"].includes(env.NODE_ENV)) throw new Error("NODE_ENV must be development, test, or production.");
  const mock = loadMockConfig(env);
  const warning = integer(env.STALE_WARNING_SECONDS, "STALE_WARNING_SECONDS");
  const critical = integer(env.STALE_CRITICAL_SECONDS, "STALE_CRITICAL_SECONDS");
  if (critical <= warning) throw new Error("STALE_CRITICAL_SECONDS must be greater than STALE_WARNING_SECONDS.");
  if (!/^\d+(?:b|kb|mb)$/i.test(env.JSON_BODY_LIMIT)) throw new Error("JSON_BODY_LIMIT must be a size such as 100kb.");
  if (!["debug", "info", "warn", "error"].includes(env.LOG_LEVEL)) throw new Error("LOG_LEVEL must be debug, info, warn, or error.");
  return Object.freeze({
    nodeEnv: env.NODE_ENV, isProduction: env.NODE_ENV === "production",
    host: validateHost(env.HOST), port: integer(env.PORT, "PORT", { max: 65535 }),
    edgeDebugUrl: url(env.EDGE_DEBUG_URL, "EDGE_DEBUG_URL", { protocols: ["http:", "https:"], loopbackOnly: true }),
    edgeConnectionTimeoutMilliseconds: integer(env.EDGE_CONNECTION_TIMEOUT_MILLISECONDS, "EDGE_CONNECTION_TIMEOUT_MILLISECONDS", { min: 1000, max: 120000 }),
    serviceTitanBaseUrl: url(env.SERVICETITAN_BASE_URL, "SERVICETITAN_BASE_URL", { protocols: ["https:"] }),
    dashboardBaseUrl: env.DASHBOARD_BASE_URL ? url(env.DASHBOARD_BASE_URL, "DASHBOARD_BASE_URL", { protocols: ["http:", "https:"] }) : null,
    timeZone: validateTimeZone(env.TIMEZONE),
    refreshIntervalSeconds: integer(env.REFRESH_INTERVAL_SECONDS, "REFRESH_INTERVAL_SECONDS", { min: 10, max: 3600 }),
    remoteOverrideSeconds: integer(env.REMOTE_OVERRIDE_SECONDS, "REMOTE_OVERRIDE_SECONDS", { min: 10, max: 3600 }),
    returnTransitionMilliseconds: integer(env.RETURN_TRANSITION_MILLISECONDS, "RETURN_TRANSITION_MILLISECONDS", { max: 60000 }),
    staleWarningSeconds: warning, staleCriticalSeconds: critical,
    jsonBodyLimit: env.JSON_BODY_LIMIT,
    remoteRateLimit: Object.freeze({ windowSeconds: integer(env.REMOTE_RATE_LIMIT_WINDOW_SECONDS, "REMOTE_RATE_LIMIT_WINDOW_SECONDS", { max: 3600 }), maxRequests: integer(env.REMOTE_RATE_LIMIT_MAX_REQUESTS, "REMOTE_RATE_LIMIT_MAX_REQUESTS", { max: 10000 }) }),
    logLevel: env.LOG_LEVEL, mockMode: mock.mockMode, developmentRoutesEnabled: mock.developmentRoutesEnabled
  });
}

module.exports = { loadConfig };
