"use strict";

function createPresentationCommandBus({ handleCommand }) {
  if (typeof handleCommand !== "function") throw new TypeError("Command bus requires a command handler.");
  return Object.freeze({ dispatch: (command) => handleCommand(command) });
}

module.exports = { createPresentationCommandBus };
