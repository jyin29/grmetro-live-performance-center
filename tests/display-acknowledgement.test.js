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
