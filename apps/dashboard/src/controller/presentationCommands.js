export const PRESENTATION_COMMANDS = Object.freeze({
  NEXT_SLIDE: "presentation/next-slide",
  PREVIOUS_SLIDE: "presentation/previous-slide",
  GO_TO_SLIDE: "presentation/go-to-slide",
  PAUSE_ROTATION: "presentation/pause-rotation",
  RESUME_ROTATION: "presentation/resume-rotation",
  RESTART_ROTATION_TIMER: "presentation/restart-rotation-timer",
});

export function createPresentationCommand(type, displayId, payload = {}) {
  return Object.freeze({ type, displayId, payload: Object.freeze({ ...payload }) });
}

export function createPresentationCommandBus({ handleCommand }) {
  if (typeof handleCommand !== "function") throw new TypeError("Command bus requires a command handler");
  return Object.freeze({
    dispatch(command) {
      if (!command || typeof command.type !== "string" || typeof command.displayId !== "string") {
        throw new TypeError("Presentation commands require type and displayId");
      }
      return handleCommand(command);
    },
  });
}
