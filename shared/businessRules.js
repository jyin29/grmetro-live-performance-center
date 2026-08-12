"use strict";

// Customer-specific policy belongs here. Conditions only inspect fields already
// prepared by the backend; actions describe presentation outcomes, not KPI math.
module.exports = Object.freeze({
  settings: Object.freeze({ eventDurationMilliseconds: 3000, overlayDurationMilliseconds: 7000,
    cooldownMilliseconds: 30 * 60 * 1000, maximumQueueSize: 20, maximumAttentionItems: 2 }),
  rules: Object.freeze([
    { id: "new-overall-leader", category: "celebration", priority: "celebration", scope: "technician",
      condition: { all: [{ path: "overall.qualifies", operator: "equals", value: true },
        { path: "overall.rank", operator: "equals", value: 1 },
        { path: "overall.rank", source: "previous", operator: "notEquals", value: 1 }] },
      action: { type: "event", eventType: "new-leader" } },
    { id: "entered-overall-top-three", category: "milestone", priority: "information", scope: "technician",
      condition: { all: [{ path: "overall.qualifies", operator: "equals", value: true },
        { path: "overall.rank", operator: "lessThanOrEqual", value: 3 },
        { path: "overall.rank", source: "previous", operator: "greaterThan", value: 3 }] },
      action: { type: "event", eventType: "entered-top-three" } },
    { id: "kpi-goal-reached", category: "milestone", priority: "celebration", scope: "kpi",
      condition: { all: [{ path: "reached", operator: "equals", value: true },
        { path: "reached", source: "previous", operator: "equals", value: false }] },
      action: { type: "event", eventType: "goal-reached" } },
    { id: "kpi-data-quality-review", category: "alert", priority: "warning", scope: "kpi",
      condition: { path: "dataQuality", operator: "in", value: ["fallback", "unavailable"] },
      action: { type: "attention", key: "data-quality", eyebrow: "Data quality", title: "{kpiLabel} needs review",
        detail: "Fallback or unavailable values are not treated as confirmed results." } },
    { id: "pause-for-event-overlay", category: "dashboard-behavior", priority: "critical", scope: "event",
      condition: { path: "active", operator: "equals", value: true },
      action: { type: "behavior", behavior: "pause-rotation" } }
  ])
});
