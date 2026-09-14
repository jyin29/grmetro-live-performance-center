const test = require("node:test");
const assert = require("node:assert/strict");
const { createPresentationCommandBus } = require("../apps/backend/src/presentation/presentationCommandBus");

test("duplicate command IDs execute only once and return the original result", () => {
  let calls = 0;
  const bus = createPresentationCommandBus({ handleCommand(command) { calls += 1; return { applied: calls, commandId: command.commandId }; } });
  const first = bus.dispatch({ type: "presentation/next", displayId: "main-office", commandId: "cmd-1" });
  const duplicate = bus.dispatch({ type: "presentation/next", displayId: "main-office", commandId: "cmd-1" });
  assert.deepEqual(duplicate, first);
  assert.equal(calls, 1);
});

test("different command IDs still execute independently", () => {
  let calls = 0;
  const bus = createPresentationCommandBus({ handleCommand() { calls += 1; return calls; } });
  assert.equal(bus.dispatch({ type: "presentation/next", displayId: "main-office", commandId: "cmd-a" }), 1);
  assert.equal(bus.dispatch({ type: "presentation/next", displayId: "main-office", commandId: "cmd-b" }), 2);
  assert.equal(calls, 2);
});

test("dedupe entries expire so the cache cannot grow forever", () => {
  let now = 0;
  let calls = 0;
  const bus = createPresentationCommandBus({ handleCommand() { calls += 1; return calls; }, clock: () => now, dedupeWindowMilliseconds: 1000 });
  assert.equal(bus.dispatch({ type: "presentation/next", displayId: "main-office", commandId: "cmd-1" }), 1);
  now = 1500;
  assert.equal(bus.dispatch({ type: "presentation/next", displayId: "main-office", commandId: "cmd-1" }), 2);
  assert.equal(calls, 2);
});
