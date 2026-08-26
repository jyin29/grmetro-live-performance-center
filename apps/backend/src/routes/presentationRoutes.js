"use strict";

const express = require("express");

function createPresentationRoutes({ presentationManager, commandBus, displayPresence }) {
  if (!presentationManager || !commandBus || !displayPresence) throw new TypeError("Presentation routes require runtime state.");
  const router = express.Router();

  router.get("/:displayId", (request, response) => {
    const state = presentationManager.getDisplayState(request.params.displayId);
    if (!state) return response.status(404).json({ ok: false, error: { code: "DISPLAY_NOT_FOUND" } });
    response.json({ ok: true, state, online: displayPresence.isOnline(request.params.displayId) });
  });

  router.post("/:displayId/heartbeat", (request, response) => {
    if (!presentationManager.getDisplayState(request.params.displayId)) return response.status(404).json({ ok: false, error: { code: "DISPLAY_NOT_FOUND" } });
    displayPresence.touch(request.params.displayId);
    response.json({ ok: true });
  });

  router.post("/:displayId/command", (request, response) => {
    if (!presentationManager.getDisplayState(request.params.displayId)) return response.status(404).json({ ok: false, error: { code: "DISPLAY_NOT_FOUND" } });
    const command = { ...request.body, displayId: request.params.displayId };
    try {
      commandBus.dispatch(command);
      response.json({ ok: true, state: presentationManager.getDisplayState(request.params.displayId) });
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
