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

function createLogger({ level = "info", destination = process.stdout, clock = () => new Date() } = {}) {
  if (!Object.hasOwn(LEVELS, level)) throw new Error(`Unknown log level: ${level}.`);
  const write = (name, message, metadata) => {
    if (LEVELS[name] < LEVELS[level]) return;
    const entry = { timestamp: clock().toISOString(), level: name, message: String(message) };
    if (metadata !== undefined) entry.metadata = redact(metadata);
    destination.write(`${JSON.stringify(entry)}\n`);
  };
  return Object.freeze(Object.fromEntries(Object.keys(LEVELS).map((name) => [name, (message, metadata) => write(name, message, metadata)])));
}

module.exports = { createLogger, redact };
