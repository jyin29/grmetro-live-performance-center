"use strict";

const OPERATORS = Object.freeze({
  equals: (actual, expected) => actual === expected,
  notEquals: (actual, expected) => actual !== expected,
  lessThanOrEqual: (actual, expected) => typeof actual === "number" && actual <= expected,
  greaterThan: (actual, expected) => typeof actual === "number" && actual > expected,
  in: (actual, expected) => Array.isArray(expected) && expected.includes(actual)
});

function readPath(value, path) {
  return String(path).split(".").reduce((current, key) => current?.[key], value);
}

function matches(condition, context) {
  if (condition.all) return condition.all.every((item) => matches(item, context));
  if (condition.any) return condition.any.some((item) => matches(item, context));
  const compare = OPERATORS[condition.operator];
  if (!compare) throw new TypeError(`Unsupported business-rule operator: ${condition.operator}`);
  return compare(readPath(condition.source === "previous" ? context.previous : context.current, condition.path), condition.value);
}

function contextsFor(rule, current, previous) {
  if (rule.scope === "technician") return current.map((record) => ({ current: record,
    previous: previous.find((item) => String(item.id) === String(record.id)), technician: record }));
  if (rule.scope === "kpi") return current.flatMap((record) => Object.entries(record.kpis || {}).map(([kpiId, metric]) => ({
    current: metric, previous: previous.find((item) => String(item.id) === String(record.id))?.kpis?.[kpiId], technician: record, kpiId
  })));
  return [];
}

function interpolate(template, context) {
  const values = { technicianName: context.technician.shortName || context.technician.name,
    kpiLabel: context.current.label || context.kpiId };
  return String(template).replace(/\{(\w+)\}/g, (_, key) => values[key] ?? "");
}

function evaluateBusinessRules({ rules, current = [], previous = [], now = new Date(), eventDurationMilliseconds = 3000 }) {
  const createdAt = new Date(now).toISOString();
  const expiresAt = new Date(new Date(createdAt).getTime() + eventDurationMilliseconds).toISOString();
  const events = []; const attention = new Map();
  for (const rule of rules) {
    for (const context of contextsFor(rule, current, previous)) {
      if (!matches(rule.condition, context)) continue;
      if (rule.action.type === "event") events.push({ type: rule.action.eventType, technicianId: context.technician.id,
        ...(context.kpiId ? { kpiId: context.kpiId } : {}), ruleId: rule.id, priority: rule.priority, createdAt, expiresAt });
      if (rule.action.type === "attention" && !attention.has(rule.action.key)) attention.set(rule.action.key, {
        id: `${rule.action.key}-${context.kpiId}`, priority: rule.priority, eyebrow: interpolate(rule.action.eyebrow, context),
        title: interpolate(rule.action.title, context), detail: interpolate(rule.action.detail, context), ruleId: rule.id
      });
    }
  }
  return Object.freeze({ events: Object.freeze(events), managementInsights: Object.freeze([...attention.values()]) });
}

module.exports = { OPERATORS, evaluateBusinessRules, matches, readPath };
