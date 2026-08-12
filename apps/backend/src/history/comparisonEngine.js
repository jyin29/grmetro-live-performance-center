"use strict";

const { deepFreeze } = require("./dashboardSnapshot");

function direction(delta) {
  return delta === null ? null : delta > 0 ? "up" : delta < 0 ? "down" : "unchanged";
}

function unavailable(reason) {
  return { available: false, reason, delta: null, direction: null, previous: null, current: null };
}

function compareNumber(previous, current, { invert = false } = {}) {
  if (!Number.isFinite(previous) || !Number.isFinite(current)) return unavailable("missing-data");
  const delta = invert ? previous - current : current - previous;
  return { available: true, reason: null, delta, direction: direction(delta), previous, current };
}

function compareMetric(previous, current) {
  if (!previous || !current || previous.hasData !== true || current.hasData !== true ||
      previous.dataQuality === "unavailable" || current.dataQuality === "unavailable") {
    return {
      value: unavailable("missing-or-unavailable-kpi"),
      ranking: unavailable("missing-or-unavailable-ranking"),
      goalProgress: unavailable("missing-goal-progress")
    };
  }
  return {
    value: compareNumber(previous.value, current.value),
    ranking: compareNumber(previous.rank, current.rank, { invert: true }),
    goalProgress: compareNumber(previous.percentComplete, current.percentComplete)
  };
}

function compareTechnician(previous, current) {
  if (!previous) return { available: false, reason: "technician-not-in-baseline", overallRanking: unavailable("missing-ranking"), kpis: {} };
  if (current.stale) return { available: false, reason: "stale-technician", overallRanking: unavailable("stale-technician"), kpis: {} };
  const kpiIds = new Set([...Object.keys(previous.kpis || {}), ...Object.keys(current.kpis || {})]);
  return {
    available: true,
    reason: null,
    overallRanking: compareNumber(previous.overall?.rank, current.overall?.rank, { invert: true }),
    kpis: Object.fromEntries([...kpiIds].map((id) => [id, compareMetric(previous.kpis?.[id], current.kpis?.[id])]))
  };
}

function compareDashboardSnapshots(previousSnapshot, currentSnapshot) {
  if (!currentSnapshot) throw new TypeError("A current dashboard snapshot is required.");
  if (!previousSnapshot) {
    return deepFreeze({ available: false, reason: "no-history", baselineSnapshotId: null,
      currentSnapshotId: currentSnapshot.id, baselineCapturedAt: null, currentCapturedAt: currentSnapshot.capturedAt,
      technicians: {} });
  }
  const previousById = new Map((previousSnapshot.dashboard.technicians || []).map((item) => [item.id, item]));
  const technicians = Object.fromEntries((currentSnapshot.dashboard.technicians || []).map((current) => [String(current.id),
    compareTechnician(previousById.get(current.id), current)]));
  return deepFreeze({
    available: true,
    reason: null,
    baselineSnapshotId: previousSnapshot.id,
    currentSnapshotId: currentSnapshot.id,
    baselineCapturedAt: previousSnapshot.capturedAt,
    currentCapturedAt: currentSnapshot.capturedAt,
    technicians
  });
}

module.exports = { compareDashboardSnapshots, compareMetric, compareNumber, direction };
