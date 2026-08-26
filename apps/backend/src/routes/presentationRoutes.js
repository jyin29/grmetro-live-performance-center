"use strict";

const express = require("express");
const { PRESENTATION_COMMANDS } = require("../../../../shared/presentation");

const ACTIONS = Object.freeze({
  next: PRESENTATION_COMMANDS.NEXT_SLIDE,
  previous: PRESENTATION_COMMANDS.PREVIOUS_SLIDE,
  pause: PRESENTATION_COMMANDS.PAUSE_ROTATION,
  resume: PRESENTATION_COMMANDS.RESUME_ROTATION,
  restart: PRESENTATION_COMMANDS.RESTART_ROTATION_TIMER,
  select: PRESENTATION_COMMANDS.GO_TO_SLIDE,
});

function createPresentationRoutes({ manager, commandBus }) {
  if (!manager || !commandBus) throw new TypeError("Presentation routes require manager and commandBus.");
  const router = express.Router();

  router.get("/:displayId", (request, response) => {
    const state = manager.getDisplayState(request.params.displayId);
    if (!state) return response.status(404).json({ ok: false, error: { code: "DISPLAY_NOT_FOUND", message: "Unknown display." } });
    return response.json({ ok: true, state });
  });

  // GET is intentional here: the phone remote can issue a same-origin command even
  // on browsers/networks where its WebSocket has gone stale. Commands are still
  // validated and applied by the single authoritative presentation manager.
  router.get("/:displayId/action/:action", (request, response, next) => {
    try {
      const type = ACTIONS[request.params.action];
      if (!type) return response.status(400).json({ ok: false, error: { code: "INVALID_ACTION", message: "Unknown presentation action." } });
      const payload = type === PRESENTATION_COMMANDS.GO_TO_SLIDE ? { index: Number(request.query.index) } : {};
      const state = commandBus.dispatch({ type, displayId: request.params.displayId, payload });
      return response.json({ ok: true, state });
    } catch (error) { return next(error); }
  });

  router.post("/:displayId/command", (request, response, next) => {
    try {
      const command = request.body || {};
      const state = commandBus.dispatch({ ...command, displayId: request.params.displayId });
      return response.json({ ok: true, state });
    } catch (error) { return next(error); }
  });

  return router;
}

module.exports = { createPresentationRoutes };
