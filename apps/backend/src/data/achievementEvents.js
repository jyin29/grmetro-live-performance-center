"use strict";

const DEFAULT_EVENT_DURATION_MS = 3000;

function detectAchievementEvents(current, previous, { now = new Date(), durationMilliseconds = DEFAULT_EVENT_DURATION_MS } = {}) {
  if (!previous) return [];
  const createdAt = new Date(now).toISOString();
  const expiresAt = new Date(new Date(createdAt).getTime() + durationMilliseconds).toISOString();
  const events = [];
  const currentQualified = current.filter((record) => record.overall?.qualifies);
  const priorQualified = previous.filter((record) => record.overall?.qualifies);
  const leader = currentQualified.find((record) => record.overall.rank === 1);
  const oldLeader = priorQualified.find((record) => record.overall.rank === 1);
  if (leader && oldLeader && leader.id !== oldLeader.id) events.push({ type: "new-leader", technicianId: leader.id, createdAt, expiresAt });
  for (const record of current) {
    const prior = previous.find((item) => item.id === record.id);
    if (record.overall?.qualifies && record.overall.rank <= 3 && prior?.overall?.rank > 3) {
      events.push({ type: "entered-top-three", technicianId: record.id, createdAt, expiresAt });
    }
    for (const [kpiId, metric] of Object.entries(record.kpis)) {
      if (metric.reached && prior?.kpis?.[kpiId]?.reached === false) events.push({ type: "goal-reached", technicianId: record.id, kpiId, createdAt, expiresAt });
    }
  }
  return events;
}

function activeEvents(events, now = new Date()) {
  const timestamp = new Date(now).getTime();
  return (events || []).filter((event) => new Date(event.expiresAt).getTime() > timestamp);
}

module.exports = { DEFAULT_EVENT_DURATION_MS, detectAchievementEvents, activeEvents };
