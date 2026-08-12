"use strict";

const { compareDashboardSnapshots } = require("./comparisonEngine");
const { deepFreeze } = require("./dashboardSnapshot");

const DEFAULT_TREND_OPTIONS = Object.freeze({ minimumHistory: 4, minimumConsistency: 0.75 });

function unknown(reason, sampleSize = 0) {
  return { available: false, reason, trend: "unknown", momentum: "unknown", sampleSize,
    comparisonCount: Math.max(0, sampleSize - 1), consistency: null,
    consecutiveIncreases: 0, consecutiveDecreases: 0, netChange: null };
}

function validateOptions(options = {}) {
  const minimumHistory = options.minimumHistory ?? DEFAULT_TREND_OPTIONS.minimumHistory;
  const minimumConsistency = options.minimumConsistency ?? DEFAULT_TREND_OPTIONS.minimumConsistency;
  if (!Number.isInteger(minimumHistory) || minimumHistory < 3) {
    throw new TypeError("Trend minimum history must be an integer of at least 3.");
  }
  if (!Number.isFinite(minimumConsistency) || minimumConsistency <= 0.5 || minimumConsistency > 1) {
    throw new TypeError("Trend minimum consistency must be greater than 0.5 and at most 1.");
  }
  return { minimumHistory, minimumConsistency };
}

function analyzeComparisons(comparisons, { minimumHistory, minimumConsistency, positive, negative }) {
  const sampleSize = comparisons.length + 1;
  if (sampleSize < minimumHistory) return unknown("insufficient-history", sampleSize);
  if (comparisons.some((item) => !item?.available)) return unknown("incomplete-history", sampleSize);

  const deltas = comparisons.map((item) => item.delta);
  const increases = deltas.filter((delta) => delta > 0).length;
  const decreases = deltas.filter((delta) => delta < 0).length;
  const unchanged = deltas.length - increases - decreases;
  const dominantCount = Math.max(increases, decreases, unchanged);
  const consistency = dominantCount / deltas.length;
  // Comparison deltas already encode domain direction (rank deltas are inverted).
  const netChange = deltas.reduce((sum, delta) => sum + delta, 0);
  let trend = "stable";
  if (consistency >= minimumConsistency && increases === dominantCount && netChange > 0) trend = positive;
  if (consistency >= minimumConsistency && decreases === dominantCount && netChange < 0) trend = negative;

  let consecutiveIncreases = 0;
  let consecutiveDecreases = 0;
  for (let index = deltas.length - 1; index >= 0 && deltas[index] > 0; index -= 1) consecutiveIncreases += 1;
  for (let index = deltas.length - 1; index >= 0 && deltas[index] < 0; index -= 1) consecutiveDecreases += 1;
  const recent = deltas.slice(-Math.min(3, deltas.length));
  const recentSum = recent.reduce((sum, delta) => sum + delta, 0);
  const momentum = recent.every((delta) => delta === 0) ? "stable"
    : recent.every((delta) => delta >= 0) && recentSum > 0 ? "increasing"
      : recent.every((delta) => delta <= 0) && recentSum < 0 ? "decreasing" : "mixed";

  return { available: true, reason: null, trend, momentum, sampleSize,
    comparisonCount: comparisons.length, consistency, consecutiveIncreases,
    consecutiveDecreases, netChange };
}

function seriesFor(comparisons, technicianId, selector) {
  return comparisons.map((comparison) => {
    const technician = comparison.technicians[String(technicianId)];
    return technician?.available ? selector(technician) : null;
  });
}

function analyzeDashboardTrends(snapshots, options = {}) {
  const settings = validateOptions(options);
  const history = Array.isArray(snapshots) ? snapshots : [];
  const current = history.at(-1);
  if (!current) return deepFreeze({ available: false, reason: "no-history", minimumHistory: settings.minimumHistory,
    snapshotCount: 0, firstSnapshotId: null, currentSnapshotId: null, technicians: {}, removedTechnicianIds: [] });

  const window = history.slice(-Math.max(settings.minimumHistory, history.length));
  const comparisons = window.slice(1).map((snapshot, index) => compareDashboardSnapshots(window[index], snapshot));
  const historicalTechnicianIds = new Set(window.flatMap((snapshot) =>
    (snapshot.dashboard.technicians || []).map(({ id }) => String(id))));
  const currentTechnicians = current.dashboard.technicians || [];
  const currentIds = new Set(currentTechnicians.map(({ id }) => String(id)));
  const technicians = Object.fromEntries(currentTechnicians.map((technician) => {
    const id = String(technician.id);
    const firstIndex = window.findIndex((snapshot) =>
      (snapshot.dashboard.technicians || []).some((item) => String(item.id) === id));
    const technicianComparisons = comparisons.slice(firstIndex);
    const technicianSampleSize = technicianComparisons.length + 1;
    const kpiIds = Object.keys(technician.kpis || {});
    return [id, {
      available: technicianSampleSize >= settings.minimumHistory,
      reason: technicianSampleSize >= settings.minimumHistory ? null : "insufficient-technician-history",
      overallRanking: analyzeComparisons(seriesFor(technicianComparisons, id, (item) => item.overallRanking),
        { ...settings, positive: "improving", negative: "declining" }),
      kpis: Object.fromEntries(kpiIds.map((kpiId) => [kpiId, {
        value: analyzeComparisons(seriesFor(technicianComparisons, id, (item) => item.kpis[kpiId]?.value),
          { ...settings, positive: "increasing", negative: "decreasing" }),
        ranking: analyzeComparisons(seriesFor(technicianComparisons, id, (item) => item.kpis[kpiId]?.ranking),
          { ...settings, positive: "improving", negative: "declining" }),
        goalProgress: analyzeComparisons(seriesFor(technicianComparisons, id, (item) => item.kpis[kpiId]?.goalProgress),
          { ...settings, positive: "improving", negative: "declining" })
      }]))
    }];
  }));
  const removedTechnicianIds = [...historicalTechnicianIds].filter((id) => !currentIds.has(id));
  return deepFreeze({ available: history.length >= settings.minimumHistory,
    reason: history.length >= settings.minimumHistory ? null : "insufficient-history",
    minimumHistory: settings.minimumHistory, snapshotCount: history.length,
    firstSnapshotId: window[0].id, currentSnapshotId: current.id, technicians, removedTechnicianIds });
}

module.exports = { DEFAULT_TREND_OPTIONS, analyzeComparisons, analyzeDashboardTrends };
