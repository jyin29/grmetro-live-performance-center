const test = require("node:test");
const assert = require("node:assert/strict");

async function setup() {
  const [{ createDisplayManager }, { createPresentationCommand, createPresentationCommandBus, PRESENTATION_COMMANDS }] = await Promise.all([
    import("../apps/dashboard/src/controller/displayManager.js"),
    import("../apps/dashboard/src/controller/presentationCommands.js"),
  ]);
  let nextTimer = 0;
  const activeTimers = new Map();
  const manager = createDisplayManager({
    displays: [
      { id: "main-office", name: "Main Office", presentationProfile: "standard" },
      { id: "dispatch", name: "Dispatch", presentationProfile: "standard" },
    ],
    slideCount: 5,
    rotationIntervalMs: 30_000,
    schedule(callback) { const id = ++nextTimer; activeTimers.set(id, callback); return id; },
    cancel(id) { activeTimers.delete(id); },
  });
  const bus = createPresentationCommandBus({ handleCommand: manager.handleCommand });
  const send = (type, displayId = "main-office", payload) => bus.dispatch(createPresentationCommand(type, displayId, payload));
  return { activeTimers, bus, manager, PRESENTATION_COMMANDS, send };
}

test("command bus dispatches its transport-independent command contract", async () => {
  const { bus, manager, PRESENTATION_COMMANDS, send } = await setup();
  assert.equal(send(PRESENTATION_COMMANDS.GO_TO_SLIDE, "main-office", { index: 3 }).activeSlideIndex, 3);
  assert.throws(() => bus.dispatch({ type: PRESENTATION_COMMANDS.NEXT_SLIDE }), /type and displayId/);
  assert.throws(() => send("presentation/not-real"), /Unknown presentation command/);
  manager.destroy();
});

test("next and previous commands wrap within only the targeted display", async () => {
  const { manager, PRESENTATION_COMMANDS, send } = await setup();
  send(PRESENTATION_COMMANDS.PREVIOUS_SLIDE);
  assert.equal(manager.getDisplayState("main-office").activeSlideIndex, 4);
  assert.equal(manager.getDisplayState("dispatch").activeSlideIndex, 0);
  send(PRESENTATION_COMMANDS.NEXT_SLIDE);
  assert.equal(manager.getDisplayState("main-office").activeSlideIndex, 0);
  manager.destroy();
});

test("pause, resume, and timer restart preserve isolated display state", async () => {
  const { activeTimers, manager, PRESENTATION_COMMANDS, send } = await setup();
  assert.equal(activeTimers.size, 2);
  send(PRESENTATION_COMMANDS.PAUSE_ROTATION, "dispatch");
  assert.equal(manager.getDisplayState("dispatch").isRunning, false);
  assert.equal(manager.getDisplayState("main-office").isRunning, true);
  assert.equal(activeTimers.size, 1);

  send(PRESENTATION_COMMANDS.RESUME_ROTATION, "dispatch");
  assert.equal(activeTimers.size, 2);
  const before = manager.getDisplayState("dispatch").timerRevision;
  send(PRESENTATION_COMMANDS.RESTART_ROTATION_TIMER, "dispatch");
  assert.equal(manager.getDisplayState("dispatch").timerRevision, before + 1);
  assert.equal(manager.getDisplayState("main-office").timerRevision, 0);
  assert.equal(activeTimers.size, 2);
  manager.destroy();
});

test("changing the target sends future commands to the newly selected display", async () => {
  const { manager, PRESENTATION_COMMANDS, send } = await setup();
  let selectedDisplayId = "main-office";
  send(PRESENTATION_COMMANDS.NEXT_SLIDE, selectedDisplayId);
  selectedDisplayId = "dispatch";
  send(PRESENTATION_COMMANDS.GO_TO_SLIDE, selectedDisplayId, { index: 4 });
  assert.equal(manager.getDisplayState("main-office").activeSlideIndex, 1);
  assert.equal(manager.getDisplayState("dispatch").activeSlideIndex, 4);
  assert.equal(manager.getDisplayState("dispatch").presentationProfile, "standard");
  manager.destroy();
});
