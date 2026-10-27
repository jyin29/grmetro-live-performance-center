const test = require("node:test");
const assert = require("node:assert/strict");
const { createDisplayPresence } = require("../apps/backend/src/routes/presentationRoutes");

test("display presence tracks the highest applied revision", () => {
  let now = 1_000;
  const presence = createDisplayPresence({ timeoutMilliseconds: 12_000, clock: () => now });
  presence.touch("main-office", { appliedRevision: 3 });
  presence.touch("main-office", { appliedRevision: 2 });
  assert.equal(presence.getAppliedRevision("main-office"), 3);
  assert.equal(presence.isOnline("main-office"), true);
  now = 14_001;
  assert.equal(presence.isOnline("main-office"), false);
  assert.equal(presence.getAppliedRevision("main-office"), 3);
});

test("display presence retains sanitized runtime health across revision-only heartbeats", () => {
  let now = 5_000;
  const presence = createDisplayPresence({ timeoutMilliseconds: 12_000, clock: () => now });
  presence.touch("lobby", { appliedRevision: 7, runtimeHealth: { sessionId: "abc-123", memoryPercent: 81, memoryPressure: true, uptimeSeconds: 120, recoveryState: "memory-pressure", relaunchCount: 2, lastRelaunchReason: "scheduled-long-runtime-refresh" } });
  assert.deepEqual(presence.getRuntimeHealth("lobby"), { sessionId: "abc-123", memoryPercent: 81, memoryPressure: true, uptimeSeconds: 120, recoveryState: "memory-pressure", relaunchCount: 2, lastRelaunchReason: "scheduled-long-runtime-refresh", lastHeartbeatAt: new Date(5_000).toISOString() });
  now = 7_000;
  presence.touch("lobby", { appliedRevision: 8 });
  assert.equal(presence.getRuntimeHealth("lobby").sessionId, "abc-123");
  assert.equal(presence.getRuntimeHealth("lobby").lastHeartbeatAt, new Date(7_000).toISOString());
});
