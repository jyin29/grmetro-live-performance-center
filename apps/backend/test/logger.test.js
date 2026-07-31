"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { createLogger } = require("../src/logger");

test("structured logger supports levels and redacts secret-like and raw payload fields", () => {
  let output = "";
  const logger = createLogger({ level: "debug", destination: { write: (chunk) => { output += chunk; } }, clock: () => new Date(0) });
  logger.debug("detail", { password: "hidden", nested: { csrfToken: "hidden" }, serviceTitanRawPayload: { private: true }, safe: "visible" });
  logger.info("info"); logger.warn("warn"); logger.error("error");
  assert.equal(output.includes("hidden"), false);
  assert.equal(output.includes("private"), false);
  assert.equal(output.includes("visible"), true);
  assert.deepEqual(output.trim().split("\n").map((line) => JSON.parse(line).level), ["debug", "info", "warn", "error"]);
});
