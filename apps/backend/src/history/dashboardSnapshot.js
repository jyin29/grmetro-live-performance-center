"use strict";

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function clone(value) {
  return typeof structuredClone === "function"
    ? structuredClone(value)
    : JSON.parse(JSON.stringify(value));
}

function validTimestamp(value, label) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) throw new TypeError(`${label} must be a valid date.`);
  return date.toISOString();
}

function createDashboardSnapshot(payload, { id, capturedAt } = {}) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new TypeError("A dashboard snapshot requires a dashboard payload.");
  }
  if (typeof id !== "string" || !id.trim()) throw new TypeError("A dashboard snapshot requires an ID.");
  const timestamp = validTimestamp(capturedAt, "Snapshot capturedAt");
  const dashboard = clone(payload);
  delete dashboard.historicalComparison;
  delete dashboard.historicalTrends;
  return deepFreeze({
    schemaVersion: 1,
    id,
    capturedAt: timestamp,
    sourceGeneratedAt: dashboard.generatedAt || null,
    sourceRefreshedAt: dashboard.refreshedAt || null,
    dashboard
  });
}

module.exports = { createDashboardSnapshot, deepFreeze };
