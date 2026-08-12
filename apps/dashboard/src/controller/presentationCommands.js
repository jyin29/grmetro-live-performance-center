import presentationConfig from "../../../../shared/presentation.json" with { type: "json" };

export const PRESENTATION_COMMANDS = Object.freeze(presentationConfig.commands);

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
