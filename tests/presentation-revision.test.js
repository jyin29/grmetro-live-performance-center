const test = require("node:test");
const assert = require("node:assert/strict");
const { createPresentationManager } = require("../apps/backend/src/presentation/presentationManager");
const { PRESENTATION_COMMANDS } = require("../shared/presentation");

test("presentation revisions advance monotonically for applied commands", () => {
  const manager = createPresentationManager({
    displays: [{ id: "main-office", name: "Main Office", presentationProfile: "standard" }],
    slideCount: 5,
    rotationMilliseconds: 30_000,
    setTimeoutFn: () => 1,
    clearTimeoutFn: () => {},
  });
  assert.equal(manager.getDisplayState("main-office").revision, 0);
  const one = manager.handleCommand({ type: PRESENTATION_COMMANDS.NEXT_SLIDE, displayId: "main-office" });
  const two = manager.handleCommand({ type: PRESENTATION_COMMANDS.PAUSE_ROTATION, displayId: "main-office" });
  assert.equal(one.revision, 1);
  assert.equal(two.revision, 2);
  manager.destroy();
});
