"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { PRESENTATION_COMMANDS } = require("../../../shared/presentation");
const { createPresentationManager } = require("../src/presentation/presentationManager");
const { createPresentationCommandBus } = require("../src/presentation/presentationCommandBus");

function setup() {
  let now = new Date("2026-08-12T12:00:00.000Z").getTime();
  let nextTimer = 0;
  const timers = new Map();
  const displays = [{ id: "main", name: "Main", presentationProfile: "standard" }, { id: "dispatch", name: "Dispatch", presentationProfile: "standard" }];
  const manager = createPresentationManager({ displays, slideCount: 5, rotationMilliseconds: 30000,
    clock: () => new Date(now), setTimeoutFn(callback, delay) { const id = ++nextTimer; timers.set(id, { callback, at: now + delay }); return id; },
    clearTimeoutFn(id) { timers.delete(id); } });
  const bus = createPresentationCommandBus({ handleCommand: manager.handleCommand });
  const command = (type, displayId = "main", payload = {}) => bus.dispatch({ type, displayId, payload });
  function advance(milliseconds) {
    const end = now + milliseconds;
    while (true) {
      const due = [...timers.entries()].filter(([, timer]) => timer.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
      if (!due) break;
      timers.delete(due[0]); now = due[1].at; due[1].callback();
    }
    now = end;
  }
  return { manager, command, advance, timers, displays };
}

test("authoritative commands navigate, jump, isolate targets, and notify multiple observers", () => {
  const { manager, command } = setup();
  const first = []; const second = [];
  manager.subscribe((state) => first.push(state)); manager.subscribe((state) => second.push(state));
  command(PRESENTATION_COMMANDS.PREVIOUS_SLIDE);
  assert.equal(manager.getDisplayState("main").activeSlideIndex, 4);
  command(PRESENTATION_COMMANDS.NEXT_SLIDE);
  command(PRESENTATION_COMMANDS.GO_TO_SLIDE, "main", { index: 3 });
  assert.equal(manager.getDisplayState("main").activeSlideIndex, 3);
  assert.equal(manager.getDisplayState("dispatch").activeSlideIndex, 0);
  assert.deepEqual(first, second);
  manager.destroy();
});

test("pause, resume, restart, and backend-owned 30-second rotation control timer state", () => {
  const { manager, command, advance, timers } = setup();
  assert.equal(timers.size, 2);
  command(PRESENTATION_COMMANDS.PAUSE_ROTATION);
  assert.equal(manager.getDisplayState("main").isRunning, false);
  advance(60000);
  assert.equal(manager.getDisplayState("main").activeSlideIndex, 0);
  command(PRESENTATION_COMMANDS.RESUME_ROTATION);
  advance(29999);
  assert.equal(manager.getDisplayState("main").activeSlideIndex, 0);
  advance(1);
  assert.equal(manager.getDisplayState("main").activeSlideIndex, 1);
  const revision = manager.getDisplayState("main").timerRevision;
  command(PRESENTATION_COMMANDS.RESTART_ROTATION_TIMER);
  assert.equal(manager.getDisplayState("main").timerRevision, revision + 1);
  assert.equal(manager.getDisplayState("main").nextRotationAt, "2026-08-12T12:02:00.000Z");
  manager.destroy();
});

test("invalid display IDs, commands, and jump payloads are rejected", () => {
  const { manager, command } = setup();
  assert.throws(() => command(PRESENTATION_COMMANDS.NEXT_SLIDE, "unknown"), /Invalid display ID/);
  assert.throws(() => command("presentation/nope"), /Invalid presentation command/);
  assert.throws(() => command(PRESENTATION_COMMANDS.GO_TO_SLIDE, "main", { index: 5 }), /between 0 and 4/);
  assert.throws(() => command(PRESENTATION_COMMANDS.GO_TO_SLIDE, "main", { index: "2" }), /integer/);
  manager.destroy();
});

test("a backend restart creates a recoverable authoritative default snapshot", () => {
  const original = setup();
  original.command(PRESENTATION_COMMANDS.GO_TO_SLIDE, "main", { index: 4 });
  original.manager.destroy();
  const restarted = setup();
  assert.deepEqual(restarted.manager.getDisplayStates().map((state) => [state.displayId, state.activeSlideIndex, state.isRunning]),
    [["main", 0, true], ["dispatch", 0, true]]);
  restarted.manager.destroy();
});
