"use strict";

function resolveGoal(technicianId, kpiId, configuration) {
  const overrides = configuration?.technicians?.[String(technicianId)];
  if (overrides && Object.hasOwn(overrides, kpiId)) return overrides[kpiId];
  if (configuration?.defaults && Object.hasOwn(configuration.defaults, kpiId)) return configuration.defaults[kpiId];
  return configuration && Object.hasOwn(configuration, kpiId) ? configuration[kpiId] : null;
}

function calculateGoal(valueRecord, goal) {
  const validGoal = typeof goal === "number" && Number.isFinite(goal) && goal > 0;
  if (!valueRecord?.hasData || !validGoal) {
    return { goal: validGoal ? goal : null, percentComplete: null, remaining: null, reached: false };
  }
  return {
    goal, percentComplete: valueRecord.value / goal * 100,
    remaining: Math.max(0, goal - valueRecord.value), reached: valueRecord.value >= goal
  };
}

function applyGoals(records, configuration) {
  return records.map((record) => ({ ...record, kpis: Object.fromEntries(Object.entries(record.kpis).map(([id, metric]) => [id,
    { ...metric, ...calculateGoal(metric, resolveGoal(record.id, id, configuration)) }
  ])) }));
}

module.exports = { resolveGoal, calculateGoal, applyGoals };
