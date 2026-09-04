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

function readCommandId(request) {
  const value = request.body?.commandId ?? request.get("X-GRMETRO-Command-Id") ?? request.query.commandId;
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function readAppliedRevision(request) {
  const value = Number(request.body?.appliedRevision);
  return Number.isSafeInteger(value) && value >= 0 ? value : undefined;
}

function createPresentationRoutes({ presentationManager, commandBus, displayPresence }) {
  if (!presentationManager || !commandBus || !displayPresence) throw new TypeError("Presentation routes require runtime state.");
  const router = express.Router();

  router.get("/:displayId", (request, response) => {
    const state = presentationManager.getDisplayState(request.params.displayId);
    if (!state) return response.status(404).json({ ok: false, error: { code: "DISPLAY_NOT_FOUND" } });
    if (request.query.clientType === "display") displayPresence.touch(request.params.displayId);
    response.set("Cache-Control", "no-store, no-cache, must-revalidate");
    const appliedRevision = displayPresence.getAppliedRevision(request.params.displayId);
    response.json({ ok: true, state, online: displayPresence.isOnline(request.params.displayId), appliedRevision, applied: Number.isSafeInteger(appliedRevision) && appliedRevision >= state.revision });
  });

  router.post("/:displayId/heartbeat", (request, response) => {
    const state = presentationManager.getDisplayState(request.params.displayId);
    if (!state) return response.status(404).json({ ok: false, error: { code: "DISPLAY_NOT_FOUND" } });
    displayPresence.touch(request.params.displayId, { appliedRevision: readAppliedRevision(request) });
    response.set("Cache-Control", "no-store");
    const appliedRevision = displayPresence.getAppliedRevision(request.params.displayId);
    response.json({ ok: true, online: true, targetRevision: state.revision, appliedRevision, applied: Number.isSafeInteger(appliedRevision) && appliedRevision >= state.revision });
  });

  function runAction(request, response) {
    const { displayId, action } = request.params;
    if (!presentationManager.getDisplayState(displayId)) return response.status(404).json({ ok: false, error: { code: "DISPLAY_NOT_FOUND" } });
    const type = ACTION_COMMANDS[action];
    if (!type) return response.status(400).json({ ok: false, error: { code: "INVALID_PRESENTATION_ACTION" } });
    const rawIndex = request.body?.index ?? request.query.index;
    const payload = action === "select" ? { index: Number(rawIndex) } : {};
    const commandId = readCommandId(request);
    try {
      const state = commandBus.dispatch({ type, displayId, payload, ...(commandId ? { commandId } : {}) });
      const resolved = state || presentationManager.getDisplayState(displayId);
      const appliedRevision = displayPresence.getAppliedRevision(displayId);
      response.set("Cache-Control", "no-store, no-cache, must-revalidate");
      response.json({ ok: true, commandId: commandId || null, state: resolved, targetRevision: resolved.revision, appliedRevision, applied: Number.isSafeInteger(appliedRevision) && appliedRevision >= resolved.revision, online: displayPresence.isOnline(displayId) });
    } catch (error) {
      response.status(400).json({ ok: false, error: { code: "INVALID_PRESENTATION_COMMAND", message: error.message } });
    }
  }

  router.post("/:displayId/action/:action", runAction);
  router.get("/:displayId/action/:action", runAction);

  router.post("/:displayId/command", (request, response) => {
    if (!presentationManager.getDisplayState(request.params.displayId)) return response.status(404).json({ ok: false, error: { code: "DISPLAY_NOT_FOUND" } });
    const commandId = readCommandId(request);
    const command = { ...request.body, displayId: request.params.displayId, ...(commandId ? { commandId } : {}) };
    try {
      const state = commandBus.dispatch(command);
      const resolved = state || presentationManager.getDisplayState(request.params.displayId);
      const appliedRevision = displayPresence.getAppliedRevision(request.params.displayId);
      response.set("Cache-Control", "no-store");
      response.json({ ok: true, commandId: commandId || null, state: resolved, targetRevision: resolved.revision, appliedRevision, applied: Number.isSafeInteger(appliedRevision) && appliedRevision >= resolved.revision });
    } catch (error) {
      response.status(400).json({ ok: false, error: { code: "INVALID_PRESENTATION_COMMAND", message: error.message } });
    }
  });

  return router;
}

function createDisplayPresence({ timeoutMilliseconds = 12000, clock = () => Date.now() } = {}) {
  const seen = new Map();
  return Object.freeze({
    touch(displayId, { appliedRevision } = {}) {
      const current = seen.get(displayId) || {};
      seen.set(displayId, { at: clock(), appliedRevision: Number.isSafeInteger(appliedRevision) ? Math.max(current.appliedRevision ?? -1, appliedRevision) : current.appliedRevision });
    },
    isOnline(displayId) { const entry = seen.get(displayId); return Boolean(entry && Number.isFinite(entry.at) && clock() - entry.at <= timeoutMilliseconds); },
    getAppliedRevision(displayId) { const value = seen.get(displayId)?.appliedRevision; return Number.isSafeInteger(value) ? value : null; },
    getOnlineDisplayIds() { return [...seen.entries()].filter(([, entry]) => Number.isFinite(entry.at) && clock() - entry.at <= timeoutMilliseconds).map(([id]) => id); },
  });
}

module.exports = { createPresentationRoutes, createDisplayPresence };
