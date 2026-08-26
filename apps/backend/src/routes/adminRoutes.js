"use strict";

const express = require("express");
const businessRules = require("../../../../shared/businessRules");
const slides = require("../../../../shared/slides");
const { PRESENTATION_DISPLAYS, PRESENTATION_ROTATION_MILLISECONDS } = require("../../../../shared/presentation");

function createAdminRoutes({ cache, presentationManager, connectionStatusProvider, eventEngine,
  applicationVersion, buildVersion = null, startedAt = new Date(), clock = () => new Date() } = {}) {
  if (!cache?.getState || !presentationManager?.getDisplayStates) {
    throw new TypeError("Admin routes require cache and presentation runtime state.");
  }
  const router = express.Router();
  router.get("/", (request, response) => {
    const now = clock();
    const cacheState = cache.getState(now);
    const connections = connectionStatusProvider?.() || { total: 0, displays: 0, remotes: 0 };
    const eventState = eventEngine?.getState?.() || { activeEvent: null, queueLength: 0 };
    const displays = presentationManager.getDisplayStates().map((display) => {
      const clients = connections.byDisplay?.[display.displayId] || { displays: 0, remotes: 0, total: 0 };
      return {
        ...display,
        // `connectedClients.total` used to include the phone remote itself, which made an
        // unplugged TV look connected as soon as somebody selected it on the remote.
        // Keep the raw socket total separately and make the primary presence fields mean
        // what the UI/user expects: is a physical dashboard display actually connected?
        connectedClients: {
          displays: clients.displays || 0,
          remotes: clients.remotes || 0,
          total: clients.displays || 0,
          socketTotal: clients.total || 0,
        },
        displayOnline: (clients.displays || 0) > 0,
        currentSlide: slides[display.activeSlideIndex] || null,
      };
    });

    response.json({
      generatedAt: now.toISOString(),
      displays,
      businessRules: { rules: businessRules.rules, settings: businessRules.settings },
      events: { activeEvent: eventState.activeEvent, pendingEvents: eventState.queueLength,
        queueSize: businessRules.settings.maximumQueueSize,
        cooldownMilliseconds: businessRules.settings.cooldownMilliseconds,
        eventDurationMilliseconds: businessRules.settings.eventDurationMilliseconds,
        overlayDurationMilliseconds: businessRules.settings.overlayDurationMilliseconds },
      presentation: { rotationIntervalMilliseconds: PRESENTATION_ROTATION_MILLISECONDS,
        profiles: [...new Set(PRESENTATION_DISPLAYS.map(({ presentationProfile }) => presentationProfile))],
        slides: slides.map(({ id, label, durationSeconds }) => ({ id, label, durationSeconds })) },
      diagnostics: { enabledByDefault: false, cacheAvailable: cacheState.available,
        cacheAgeMilliseconds: cacheState.cacheAgeMilliseconds, lastSuccessfulRefreshAt: cacheState.lastSuccessfulRefreshAt,
        lastFailureCode: cacheState.lastFailure?.code || null },
      system: { applicationVersion, buildVersion, uptimeSeconds: Math.max(0, Math.floor((now - startedAt) / 1000)),
        websocketStatus: "running", backendStatus: "running", dashboardStatus: cacheState.available ? "available" : "waiting-for-data",
        connectedClients: connections.total || 0, connectedDisplays: connections.displays || 0, connectedRemotes: connections.remotes || 0 },
    });
  });
  return router;
}

module.exports = { createAdminRoutes };
