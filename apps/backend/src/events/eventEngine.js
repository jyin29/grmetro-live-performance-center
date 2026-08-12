"use strict";

const EVENT_PRIORITIES = Object.freeze({ critical: 0, celebration: 1, information: 2 });
const businessRules = require("../../../../shared/businessRules");
const DEFAULTS = Object.freeze({ displayDurationMilliseconds: businessRules.settings.overlayDurationMilliseconds,
  cooldownMilliseconds: businessRules.settings.cooldownMilliseconds,
  maximumQueueSize: businessRules.settings.maximumQueueSize, maximumDeduplicationEntries: 100 });

function asDate(value, label) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) throw new TypeError(`${label} must be a valid date.`);
  return date;
}

function technician(payload, id) { return payload?.technicians?.find((item) => String(item.id) === String(id)); }

function achievementCandidate(event, payload) {
  const person = technician(payload, event.technicianId);
  const name = person?.shortName || person?.name;
  if (!name) return null;
  if (event.type === "new-leader") return { key: `new-leader:${event.technicianId}`, priority: "celebration",
    eyebrow: "New Overall #1", title: `${name} takes the lead`, detail: "Now ranked #1 overall.", sourceCreatedAt: event.createdAt };
  if (event.type === "entered-top-three") return { key: `entered-top-three:${event.technicianId}`, priority: "information",
    eyebrow: "Ranking Achievement", title: `${name} entered the Top 3`, detail: `Now ranked #${person.overall?.rank} overall.`, sourceCreatedAt: event.createdAt };
  if (event.type === "goal-reached") {
    const metric = person.kpis?.[event.kpiId];
    if (!metric?.hasData || !metric.reached) return null;
    const label = event.kpiId === "revenue" ? "Revenue" : metric.label || event.kpiId;
    return { key: `goal-reached:${event.technicianId}:${event.kpiId}`, priority: "celebration",
      eyebrow: `${label} Goal Achieved`, title: `${name} reached a personal goal`,
      detail: metric.percentComplete === null ? `${label} goal reached.` : `${Math.round(metric.percentComplete)}% of the configured ${label} goal.`, sourceCreatedAt: event.createdAt };
  }
  return null;
}

function insightCandidate(insight) {
  if (!insight?.id || insight.priority !== "critical" || !insight.title) return null;
  return { key: `insight:${insight.id}`, priority: "critical", eyebrow: insight.eyebrow || "Critical Update",
    title: insight.title, detail: insight.detail || "Management attention is required.", sourceCreatedAt: insight.createdAt };
}

function candidatesFromPayload(payload) {
  const insights = Array.isArray(payload?.managementInsights) ? payload.managementInsights : payload?.managementInsights?.insights;
  return [...(payload?.events || []).map((event) => achievementCandidate(event, payload)),
    ...(Array.isArray(insights) ? insights.map(insightCandidate) : [])].filter(Boolean);
}

function createEventEngine({ clock = () => new Date(), setTimeoutFn = setTimeout, clearTimeoutFn = clearTimeout,
  displayDurationMilliseconds = DEFAULTS.displayDurationMilliseconds, cooldownMilliseconds = DEFAULTS.cooldownMilliseconds,
  maximumQueueSize = DEFAULTS.maximumQueueSize, maximumDeduplicationEntries = DEFAULTS.maximumDeduplicationEntries } = {}) {
  for (const [label, value] of Object.entries({ displayDurationMilliseconds, cooldownMilliseconds, maximumQueueSize, maximumDeduplicationEntries })) {
    if (!Number.isInteger(value) || value <= 0) throw new TypeError(`${label} must be a positive integer.`);
  }
  let activeEvent = null; let timer = null; let sequence = 0; let revision = 0;
  const queue = []; const cooldowns = new Map(); const listeners = new Set();
  const nowMs = () => asDate(clock(), "Event engine clock").getTime();
  const snapshot = () => Object.freeze({ activeEvent: activeEvent ? Object.freeze({ ...activeEvent }) : null,
    queueLength: queue.length, revision });
  function emit() { const state = snapshot(); for (const listener of listeners) listener(state); return state; }
  function remember(key, timestamp) {
    cooldowns.delete(key); cooldowns.set(key, timestamp);
    while (cooldowns.size > maximumDeduplicationEntries) cooldowns.delete(cooldowns.keys().next().value);
  }
  function activateNext() {
    if (activeEvent || queue.length === 0) return;
    const candidate = queue.shift(); const started = nowMs();
    activeEvent = Object.freeze({ id: `event-${String(++sequence).padStart(6, "0")}`, ...candidate,
      createdAt: new Date(started).toISOString(), expiresAt: new Date(started + candidate.displayDurationMilliseconds).toISOString() });
    remember(candidate.key, started); revision += 1;
    timer = setTimeoutFn(expireActive, candidate.displayDurationMilliseconds); timer?.unref?.(); emit();
  }
  function expireActive() {
    if (!activeEvent) return snapshot();
    if (timer) clearTimeoutFn(timer); timer = null; activeEvent = null; revision += 1;
    if (queue.length) activateNext(); else emit();
    return snapshot();
  }
  function enqueue(candidates) {
    const timestamp = nowMs();
    for (const candidate of candidates || []) {
      if (!candidate || !Object.hasOwn(EVENT_PRIORITIES, candidate.priority) || typeof candidate.key !== "string") continue;
      const seenAt = cooldowns.get(candidate.key);
      if ((seenAt !== undefined && timestamp - seenAt < cooldownMilliseconds) || activeEvent?.key === candidate.key || queue.some((item) => item.key === candidate.key)) continue;
      queue.push({ ...candidate, displayDurationMilliseconds: Number.isInteger(candidate.displayDurationMilliseconds) && candidate.displayDurationMilliseconds > 0
        ? candidate.displayDurationMilliseconds : displayDurationMilliseconds, order: sequence++ });
    }
    queue.sort((left, right) => EVENT_PRIORITIES[left.priority] - EVENT_PRIORITIES[right.priority]
      || String(left.sourceCreatedAt || "").localeCompare(String(right.sourceCreatedAt || "")) || left.key.localeCompare(right.key) || left.order - right.order);
    if (queue.length > maximumQueueSize) queue.length = maximumQueueSize;
    activateNext(); return snapshot();
  }
  return Object.freeze({
    enqueue, process(payload) { return enqueue(candidatesFromPayload(payload)); }, getState: snapshot, expireActive,
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    destroy() { if (timer) clearTimeoutFn(timer); timer = null; activeEvent = null; queue.length = 0; cooldowns.clear(); listeners.clear(); }
  });
}

module.exports = { DEFAULTS, EVENT_PRIORITIES, candidatesFromPayload, createEventEngine };
