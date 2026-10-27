"use strict";

const { PRESENTATION_COMMANDS } = require("../../../../shared/presentation");

function normalizeIndex(index, count) {
  if (!Number.isInteger(index)) throw new TypeError("Slide index must be an integer.");
  if (index < 0 || index >= count) throw new RangeError(`Slide index must be between 0 and ${count - 1}.`);
  return index;
}

function normalizeEligibleSlideIndices(indices, slideCount) {
  const eligible = Array.isArray(indices) ? [...new Set(indices.filter((index) => Number.isInteger(index) && index >= 0 && index < slideCount))] : [];
  return eligible.length ? eligible.sort((left, right) => left - right) : [0];
}

function createPresentationManager({ displays, slideCount, rotationMilliseconds, clock = () => new Date(),
  setTimeoutFn = setTimeout, clearTimeoutFn = clearTimeout, eventEngine,
  getEligibleSlideIndices = () => Array.from({ length: slideCount }, (_, index) => index),
  getSlideAvailabilityRevision = () => null, subscribeSlideEligibility,
  slideIds = Array.from({ length: slideCount }, (_, index) => String(index)) } = {}) {
  const states = new Map();
  const timers = new Map();
  const listeners = new Set();

  function timestamp() { return clock().toISOString(); }
  let eventState = eventEngine?.getState?.() || { activeEvent: null, queueLength: 0, revision: 0 };
  function eligibleSlides() { return normalizeEligibleSlideIndices(getEligibleSlideIndices(), slideCount); }
  function adjacentSlide(currentIndex, direction) {
    const eligible = eligibleSlides(); const position = eligible.indexOf(currentIndex);
    if (position < 0) return direction > 0 ? (eligible.find((index) => index > currentIndex) ?? eligible[0]) : ([...eligible].reverse().find((index) => index < currentIndex) ?? eligible.at(-1));
    return eligible[(position + direction + eligible.length) % eligible.length];
  }
  function publicState(state) { const eligibleSlideIndices = eligibleSlides(); const activeSlideIndex = eligibleSlideIndices.includes(state.activeSlideIndex) ? state.activeSlideIndex : eligibleSlideIndices[0]; return Object.freeze({ ...state, activeSlideIndex, activeSlideId: slideIds[activeSlideIndex] ?? null, eligibleSlideIndices: Object.freeze(eligibleSlideIndices), eligibleSlideIds: Object.freeze(eligibleSlideIndices.map((index) => slideIds[index]).filter(Boolean)), slideAvailabilityRevision: getSlideAvailabilityRevision(), event: eventState.activeEvent, eventQueueLength: eventState.queueLength,
    eventRevision: eventState.revision, rotationPausedForEvent: Boolean(eventState.activeEvent) }); }
  for (const display of displays) states.set(display.id, {
    displayId: display.id, displayName: display.name, activeSlideIndex: 0, isRunning: true,
    rotationStartedAt: timestamp(), nextRotationAt: null, presentationProfile: display.presentationProfile,
    lastUpdated: timestamp(), timerRevision: 1, revision: 0,
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
    state.nextRotationAt = state.isRunning && !eventState.activeEvent ? new Date(clock().getTime() + rotationMilliseconds).toISOString() : null;
    if (state.isRunning && !eventState.activeEvent) timers.set(displayId, setTimeoutFn(() => advance(displayId), rotationMilliseconds));
  }
  function update(displayId, changes, restartTimer = true) {
    const state = requireDisplay(displayId);
    Object.assign(state, changes, { lastUpdated: timestamp(), revision: state.revision + 1 });
    if (restartTimer) armTimer(displayId);
    return emit(displayId);
  }
  function advance(displayId) {
    const state = requireDisplay(displayId);
    return update(displayId, { activeSlideIndex: adjacentSlide(state.activeSlideIndex, 1) }, true);
  }
  function handleCommand(command) {
    if (!command || typeof command.type !== "string" || typeof command.displayId !== "string") {
      throw new TypeError("Presentation commands require type and displayId.");
    }
    const state = requireDisplay(command.displayId);
    const payload = command.payload ?? {};
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new TypeError("Command payload must be an object.");
    switch (command.type) {
      case PRESENTATION_COMMANDS.NEXT_SLIDE: return update(command.displayId, { activeSlideIndex: adjacentSlide(state.activeSlideIndex, 1) });
      case PRESENTATION_COMMANDS.PREVIOUS_SLIDE: return update(command.displayId, { activeSlideIndex: adjacentSlide(state.activeSlideIndex, -1) });
      case PRESENTATION_COMMANDS.GO_TO_SLIDE: {
        const index = normalizeIndex(payload.index, slideCount);
        if (!eligibleSlides().includes(index)) throw new RangeError("The selected slide is not currently available.");
        return update(command.displayId, { activeSlideIndex: index });
      }
      case PRESENTATION_COMMANDS.PAUSE_ROTATION: return update(command.displayId, { isRunning: false });
      case PRESENTATION_COMMANDS.RESUME_ROTATION: return update(command.displayId, { isRunning: true });
      case PRESENTATION_COMMANDS.RESTART_ROTATION_TIMER: return update(command.displayId, { activeSlideIndex: eligibleSlides()[0], isRunning: true });
      default: throw new RangeError("Invalid presentation command.");
    }
  }
  const unsubscribeEvent = eventEngine?.subscribe?.((nextEventState) => {
    const wasVisible = Boolean(eventState.activeEvent); eventState = nextEventState;
    for (const { id } of displays) {
      const state = requireDisplay(id); state.lastUpdated = timestamp(); state.revision += 1;
      cancelTimer(id);
      if (wasVisible && !eventState.activeEvent) armTimer(id, true);
      emit(id);
    }
  }) || (() => {});
  const unsubscribeSlideEligibility = subscribeSlideEligibility?.(() => {
    const eligible = eligibleSlides();
    for (const { id } of displays) {
      const state = requireDisplay(id);
      if (!eligible.includes(state.activeSlideIndex)) update(id, { activeSlideIndex: eligible[0] }, true);
      else { state.lastUpdated = timestamp(); state.revision += 1; emit(id); }
    }
  }) || (() => {});
  for (const { id } of displays) armTimer(id, false);
  return Object.freeze({
    getDisplayState,
    getDisplayStates: () => displays.map(({ id }) => getDisplayState(id)),
    handleCommand,
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    destroy() { unsubscribeEvent(); unsubscribeSlideEligibility(); for (const id of states.keys()) cancelTimer(id); listeners.clear(); },
  });
}

module.exports = { createPresentationManager };
