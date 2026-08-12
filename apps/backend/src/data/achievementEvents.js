"use strict";

const businessRules = require("../../../../shared/businessRules");
const { evaluateBusinessRules } = require("../rules/businessRulesEngine");

const DEFAULT_EVENT_DURATION_MS = businessRules.settings.eventDurationMilliseconds;

function detectAchievementEvents(current, previous, { now = new Date(), durationMilliseconds = DEFAULT_EVENT_DURATION_MS,
  rules = businessRules.rules } = {}) {
  if (!previous) return [];
  return evaluateBusinessRules({ rules, current, previous, now, eventDurationMilliseconds: durationMilliseconds }).events;
}

function activeEvents(events, now = new Date()) {
  const timestamp = new Date(now).getTime();
  return (events || []).filter((event) => new Date(event.expiresAt).getTime() > timestamp);
}

module.exports = { DEFAULT_EVENT_DURATION_MS, detectAchievementEvents, activeEvents };
