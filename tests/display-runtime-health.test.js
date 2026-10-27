const test = require("node:test");
const assert = require("node:assert/strict");

test("display runtime health formatting stays compact for the remote", async () => {
  const { formatDisplayUptime, formatHeartbeatAge, formatMemoryHealth, formatRecoveryReason, shortSessionId } = await import("../apps/dashboard/src/lib/displayRuntimeHealth.js");
  assert.equal(formatDisplayUptime(8_280), "2h 18m");
  assert.equal(formatDisplayUptime(65), "1m 5s");
  assert.equal(formatHeartbeatAge("2026-09-08T20:00:00.000Z", Date.parse("2026-09-08T20:00:02.900Z")), "2 sec ago");
  assert.equal(formatMemoryHealth({ memoryPercent: 43, memoryPressure: false }), "43%");
  assert.equal(formatMemoryHealth({ memoryPercent: 84, memoryPressure: true }), "84% · pressure");
  assert.equal(formatMemoryHealth({}), "Not reported");
  assert.equal(formatRecoveryReason("sustained-memory-pressure-with-healthy-backend"), "sustained memory pressure with healthy backend");
  assert.equal(shortSessionId("abcdefghijklmnop"), "…efghijklmnop");
});
