"use strict";

function createPresentationCommandBus({ handleCommand, clock = () => Date.now(), dedupeWindowMilliseconds = 5 * 60 * 1000, maxEntries = 500 } = {}) {
  if (typeof handleCommand !== "function") throw new TypeError("Command bus requires a command handler.");
  const completed = new Map();

  function prune(now) {
    for (const [id, entry] of completed) if (now - entry.at > dedupeWindowMilliseconds) completed.delete(id);
    while (completed.size > maxEntries) completed.delete(completed.keys().next().value);
  }

  function dispatch(command) {
    if (!command || typeof command !== "object") throw new TypeError("Command bus requires a command object.");
    const commandId = typeof command.commandId === "string" && command.commandId.trim() ? command.commandId.trim() : null;
    const now = clock();
    prune(now);
    if (commandId && completed.has(commandId)) return completed.get(commandId).result;
    const result = handleCommand(command);
    if (commandId) completed.set(commandId, { at: now, result });
    return result;
  }

  return Object.freeze({ dispatch, getDedupeSize: () => completed.size });
}

module.exports = { createPresentationCommandBus };
