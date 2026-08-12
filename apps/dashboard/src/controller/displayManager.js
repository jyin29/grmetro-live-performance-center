import { PRESENTATION_COMMANDS } from "./presentationCommands.js";
import { normalizeSlideIndex } from "./presentationControllerState.js";

export function createDisplayManager({ displays, slideCount, rotationIntervalMs, schedule = setInterval, cancel = clearInterval }) {
  const states = new Map(displays.map((display) => [display.id, Object.freeze({
    displayId: display.id,
    displayName: display.name,
    presentationProfile: display.presentationProfile,
    activeSlideIndex: 0,
    isRunning: true,
    timerRevision: 0,
  })]));
  const timers = new Map();
  const runtimePauses = new Set();
  const listeners = new Set();

  const getDisplayState = (displayId) => states.get(displayId) ?? null;
  const notify = () => listeners.forEach((listener) => listener());
  const armTimer = (displayId) => {
    if (timers.has(displayId)) cancel(timers.get(displayId));
    const state = getDisplayState(displayId);
    if (!state?.isRunning || runtimePauses.has(displayId)) { timers.delete(displayId); return; }
    timers.set(displayId, schedule(() => handleCommand({ type: PRESENTATION_COMMANDS.NEXT_SLIDE, displayId, payload: { automatic: true } }), rotationIntervalMs));
  };
  const update = (displayId, changes, restartTimer = false) => {
    const current = getDisplayState(displayId);
    if (!current) throw new RangeError(`Unknown display: ${displayId}`);
    states.set(displayId, Object.freeze({ ...current, ...changes }));
    if (restartTimer) armTimer(displayId);
    notify();
    return getDisplayState(displayId);
  };
  const handleCommand = (command) => {
    const current = getDisplayState(command.displayId);
    if (!current) throw new RangeError(`Unknown display: ${command.displayId}`);
    switch (command.type) {
      case PRESENTATION_COMMANDS.NEXT_SLIDE:
        return update(command.displayId, { activeSlideIndex: normalizeSlideIndex(current.activeSlideIndex + 1, slideCount) }, !command.payload?.automatic);
      case PRESENTATION_COMMANDS.PREVIOUS_SLIDE:
        return update(command.displayId, { activeSlideIndex: normalizeSlideIndex(current.activeSlideIndex - 1, slideCount) }, true);
      case PRESENTATION_COMMANDS.GO_TO_SLIDE:
        return update(command.displayId, { activeSlideIndex: normalizeSlideIndex(command.payload?.index, slideCount) }, true);
      case PRESENTATION_COMMANDS.PAUSE_ROTATION:
        return update(command.displayId, { isRunning: false }, true);
      case PRESENTATION_COMMANDS.RESUME_ROTATION:
        return update(command.displayId, { isRunning: true }, true);
      case PRESENTATION_COMMANDS.RESTART_ROTATION_TIMER:
        return update(command.displayId, { timerRevision: current.timerRevision + 1 }, true);
      default:
        throw new RangeError(`Unknown presentation command: ${command.type}`);
    }
  };

  displays.forEach(({ id }) => armTimer(id));
  return Object.freeze({
    getDisplayState,
    getDisplayStates: () => displays.map(({ id }) => getDisplayState(id)),
    handleCommand,
    setRuntimePaused(displayId, paused) {
      if (!getDisplayState(displayId)) throw new RangeError(`Unknown display: ${displayId}`);
      if (paused) runtimePauses.add(displayId); else runtimePauses.delete(displayId);
      armTimer(displayId);
    },
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    destroy() { timers.forEach((timer) => cancel(timer)); timers.clear(); runtimePauses.clear(); listeners.clear(); },
  });
}
