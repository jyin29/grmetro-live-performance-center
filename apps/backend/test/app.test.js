"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { createApp } = require("../src/app");
const { DashboardCache } = require("../src/cache/dashboardCache");
const businessRules = require("../../../shared/businessRules");

function fixture(overrides = {}) {
  const cache = overrides.cache || new DashboardCache({ clock: () => new Date("2026-07-31T16:00:00Z") });
  const app = createApp({
    cache,
    logger: { debug() {}, info() {}, warn() {}, error() {} },
    config: { nodeEnv: "test", enableDevelopmentRoutes: false },
    ...overrides
  });
  return { app, cache };
}

// NOTE: preserve the remainder of this test file from the branch when editing.
