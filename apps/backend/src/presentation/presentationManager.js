"use strict";

const { PRESENTATION_COMMANDS } = require("../../../../shared/presentation");

function normalizeIndex(index, count) {
  if (!Number.isInteger(index)) throw new TypeError("Slide index must be an integer.");
  if (index < 0 || index >= count) throw new RangeError(`Slide index must be between 0 and ${count - 1}.`);
  return index;
}

function createPresentationManager({ displays, slideCount, rotationMilliseconds, clock = () => new Date(),
  setTimeoutFn = setTimeout, clearTimeoutFn = clearTimeout } = {}) {
  const states = new Map();
  const timers = new Map();
  const listeners = new Set();

  function timestamp() { return clock().toISOString(); }
  function publicState(state) { return Object.freeze({ ...state }); }
  for (const display of displays) states.set(display.id, {
    displayId: display.id, displayName: display.name, activeSlideIndex: 0, isRunning: true,
    rotationStartedAt: timestamp(), nextRotationAt: null, presentationProfile: display.presentationProfile,
    lastUpdated: timestamp(), timerRevision: 1,
  });

  function getDisplayState(displayId) { return states.has(displayId) ? publicState(states.get(displayId)) : null; }
  function requireDisplay(displayId) {
    if (typeof displayId !== "string" || !states.has(displayId)) throw new RangeError("Invalid display ID.");
    return states.get(displayId);
  }
  function emit(displayId) {
    const state = getDisplayState(displayId);
    for (const listener of listeners) listener(state);
    return state;
  }
  function cancelTimer(displayId) {
    if (timers.has(displayId)) clearTimeoutFn(timers.get(displayId));
    timers.delete(displayId);
  }
  function armTimer(displayId, incrementRevision = true) {
    const state = requireDisplay(displayId);
    cancelTimer(displayId);
    if (incrementRevision) state.timerRevision += 1;
    state.rotationStartedAt = timestamp();
    state.nextRotationAt = state.isRunning ? new Date(clock().getTime() + rotationMilliseconds).toISOString() : null;
    if (state.isRunning) timers.set(displayId, setTimeoutFn(() => advance(displayId), rotationMilliseconds));
  }
  function update(displayId, changes, restartTimer = true) {
    const state = requireDisplay(displayId);
    Object.assign(state, changes, { lastUpdated: timestamp() });
    if (restartTimer) armTimer(displayId);
    return emit(displayId);
  }
  function advance(displayId) {
    const state = requireDisplay(displayId);
    return update(displayId, { activeSlideIndex: (state.activeSlideIndex + 1) % slideCount }, true);
  }
  function handleCommand(command) {
    if (!command || typeof command.type !== "string" || typeof command.displayId !== "string") {
      throw new TypeError("Presentation commands require type and displayId.");
    }
    const state = requireDisplay(command.displayId);
    const payload = command.payload ?? {};
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new TypeError("Command payload must be an object.");
    switch (command.type) {
      case PRESENTATION_COMMANDS.NEXT_SLIDE: return update(command.displayId, { activeSlideIndex: (state.activeSlideIndex + 1) % slideCount });
      case PRESENTATION_COMMANDS.PREVIOUS_SLIDE: return update(command.displayId, { activeSlideIndex: (state.activeSlideIndex - 1 + slideCount) % slideCount });
      case PRESENTATION_COMMANDS.GO_TO_SLIDE: return update(command.displayId, { activeSlideIndex: normalizeIndex(payload.index, slideCount) });
      case PRESENTATION_COMMANDS.PAUSE_ROTATION: return update(command.displayId, { isRunning: false });
      case PRESENTATION_COMMANDS.RESUME_ROTATION: return update(command.displayId, { isRunning: true });
      case PRESENTATION_COMMANDS.RESTART_ROTATION_TIMER: return update(command.displayId, {});
      default: throw new RangeError("Invalid presentation command.");
    }
  }
  for (const { id } of displays) armTimer(id, false);
  return Object.freeze({
    getDisplayState,
    getDisplayStates: () => displays.map(({ id }) => getDisplayState(id)),
    handleCommand,
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    destroy() { for (const id of states.keys()) cancelTimer(id); listeners.clear(); },
  });
}

module.exports = { createPresentationManager };
