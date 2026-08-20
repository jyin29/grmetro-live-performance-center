"use strict";

const LEVELS = Object.freeze({ debug: 10, info: 20, warn: 30, error: 40 });
const SECRET_KEY = /(?:authorization|cookie|csrf|password|secret|session|token|api[-_]?key)/i;
const RAW_PAYLOAD_KEY = /(?:raw|response|payload).*service.?titan|service.?titan.*(?:raw|response|payload)/i;

function redact(value, seen = new WeakSet()) {
  if (value instanceof Error) return { name: value.name, message: value.message, stack: value.stack };
  if (!value || typeof value !== "object") return value;
  if (seen.has(value)) return "[Circular]";
  seen.add(value);
  if (Array.isArray(value)) return value.map((item) => redact(item, seen));
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key,
    SECRET_KEY.test(key) || RAW_PAYLOAD_KEY.test(key) ? "[REDACTED]" : redact(item, seen)
  ]));
}

function readableValue(value) {
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value);
}

function readableEntry({ timestamp, level, message, metadata }) {
  const time = new Date(timestamp).toLocaleTimeString("en-US", { hour12: false });
  const heading = `[${time}] ${level.toUpperCase().padEnd(5)} ${message}`;
  if (!metadata || typeof metadata !== "object" || !Object.keys(metadata).length) return `${heading}\n`;
  const lines = Object.entries(metadata).map(([key, value]) => `    ${key}: ${readableValue(value)}`);
  return `${heading}\n${lines.join("\n")}\n`;
}

function createLogger({ level = "info", destination = process.stdout, clock = () => new Date(), json = process.env.LOG_FORMAT === "json" || process.env.NODE_ENV === "production" } = {}) {
  if (!Object.hasOwn(LEVELS, level)) throw new Error(`Unknown log level: ${level}.`);
  const write = (name, message, metadata) => {
    if (LEVELS[name] < LEVELS[level]) return;
    const entry = { timestamp: clock().toISOString(), level: name, message: String(message) };
    if (metadata !== undefined) entry.metadata = redact(metadata);
    destination.write(json ? `${JSON.stringify(entry)}\n` : readableEntry(entry));
  };
  return Object.freeze(Object.fromEntries(Object.keys(LEVELS).map((name) => [name, (message, metadata) => write(name, message, metadata)])));
}

module.exports = { createLogger, redact, readableEntry };
