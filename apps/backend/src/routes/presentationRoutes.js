"use strict";

const express = require("express");
const { PRESENTATION_COMMANDS } = require("../../../../shared/presentation");

const ACTION_COMMANDS = Object.freeze({
  next: PRESENTATION_COMMANDS.NEXT_SLIDE,
  previous: PRESENTATION_COMMANDS.PREVIOUS_SLIDE,
  pause: PRESENTATION_COMMANDS.PAUSE_ROTATION,
  resume: PRESENTATION_COMMANDS.RESUME_ROTATION,
  restart: PRESENTATION_COMMANDS.RESTART_ROTATION_TIMER,
  select: PRESENTATION_COMMANDS.GO_TO_SLIDE,
});

function createPresentationRoutes({ presentationManager, commandBus, displayPresence }) {
  if (!presentationManager || !commandBus || !displayPresence) throw new TypeError("Presentation routes require runtime state.");
  const router = express.Router();

  router.get("/:displayId", (request, response) => {
    const state = presentationManager.getDisplayState(request.params.displayId);
    if (!state) return response.status(404).json({ ok: false, error: { code: "DISPLAY_NOT_FOUND" } });
    // A real dashboard identifies itself on its normal 1-second state poll. Treat that
    // poll as presence too, so TV detection does not depend on WebSockets or a separate
    // heartbeat request surviving the local network/browser. Remote polls never touch it.
    if (request.query.clientType === "display") displayPresence.touch(request.params.displayId);
    response.set("Cache-Control", "no-store, no-cache, must-revalidate");
    response.json({ ok: true, state, online: displayPresence.isOnline(request.params.displayId) });
  });

  router.post("/:displayId/heartbeat", (request, response) => {
    if (!presentationManager.getDisplayState(request.params.displayId)) return response.status(404).json({ ok: false, error: { code: "DISPLAY_NOT_FOUND" } });
    displayPresence.touch(request.params.displayId);
    response.set("Cache-Control", "no-store");
    response.json({ ok: true, online: true });
  });

  router.post("/:displayId/action/:action", (request, response) => {
    const { displayId, action } = request.params;
    if (!presentationManager.getDisplayState(displayId)) return response.status(404).json({ ok: false, error: { code: "DISPLAY_NOT_FOUND" } });
    const type = ACTION_COMMANDS[action];
    if (!type) return response.status(400).json({ ok: false, error: { code: "INVALID_PRESENTATION_ACTION" } });
    const payload = action === "select" ? { index: Number(request.body?.index) } : {};
    try {
      const state = commandBus.dispatch({ type, displayId, payload });
      response.set("Cache-Control", "no-store, no-cache, must-revalidate");
      response.json({ ok: true, state: state || presentationManager.getDisplayState(displayId), online: displayPresence.isOnline(displayId) });
    } catch (error) {
      response.status(400).json({ ok: false, error: { code: "INVALID_PRESENTATION_COMMAND", message: error.message } });
    }
  });

  router.post("/:displayId/command", (request, response) => {
    if (!presentationManager.getDisplayState(request.params.displayId)) return response.status(404).json({ ok: false, error: { code: "DISPLAY_NOT_FOUND" } });
    const command = { ...request.body, displayId: request.params.displayId };
    try {
      const state = commandBus.dispatch(command);
      response.set("Cache-Control", "no-store");
      response.json({ ok: true, state: state || presentationManager.getDisplayState(request.params.displayId) });
    } catch (error) {
      response.status(400).json({ ok: false, error: { code: "INVALID_PRESENTATION_COMMAND", message: error.message } });
    }
  });

  return router;
}

function createDisplayPresence({ timeoutMilliseconds = 12000, clock = () => Date.now() } = {}) {
  const seen = new Map();
  return Object.freeze({
    touch(displayId) { seen.set(displayId, clock()); },
    isOnline(displayId) { const at = seen.get(displayId); return Number.isFinite(at) && clock() - at <= timeoutMilliseconds; },
    getOnlineDisplayIds() { return [...seen.keys()].filter((id) => { const at = seen.get(id); return Number.isFinite(at) && clock() - at <= timeoutMilliseconds; }); },
  });
}

module.exports = { createPresentationRoutes, createDisplayPresence };
