"use strict";

const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");
const test = require("node:test");
const { installGracefulShutdown } = require("../src/server");

test("graceful shutdown hooks can be invoked without terminating the test process", async () => {
  const processTarget = new EventEmitter();
  const messages = [];
  const logger = Object.fromEntries(["debug", "info", "warn", "error"].map((level) => [level, (message) => messages.push([level, message])]));
  let closes = 0;
  let schedulerStops = 0;
  const hooks = installGracefulShutdown({ server: { close: (callback) => { closes += 1; callback(); } }, scheduler: { stop: () => { schedulerStops += 1; } }, logger, processTarget });
  processTarget.emit("SIGTERM");
  await hooks.shutdown("test");
  hooks.remove();
  assert.equal(closes, 1);
  assert.equal(schedulerStops, 1);
  assert.equal(messages.some(([, message]) => message === "Graceful shutdown complete"), true);
});
