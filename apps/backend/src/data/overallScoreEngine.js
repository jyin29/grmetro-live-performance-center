"use strict";

function validateWeights(weights, tolerance = 0.000001) {
  if (!weights || Object.values(weights).some((weight) => !Number.isFinite(weight) || weight < 0)) throw new TypeError("Overall-score weights must be finite nonnegative numbers.");
  const total = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
  if (Math.abs(total - 1) > tolerance) throw new RangeError(`Overall-score weights must total approximately 1.0; received ${total}.`);
  return total;
}

function calculateOverallScores(records, config, previousRecords = []) {
  validateWeights(config.weights);
  const previousById = new Map(previousRecords.map((record) => [record.id, record.overall?.rank ?? null]));
  const scored = records.map((record) => {
    let validWeight = 0, contribution = 0;
    for (const [kpiId, weight] of Object.entries(config.weights)) {
      const metric = record.kpis[kpiId];
      if (!metric?.hasData || !(metric.goal > 0)) continue;
      validWeight += weight;
      contribution += Math.min(metric.value / metric.goal, config.contributionCap) * weight;
    }
    const qualifies = validWeight + 1e-12 >= config.minimumValidWeight;
    return { ...record, overall: { qualifies, status: qualifies ? "qualified" : "insufficient-data", validWeight,
      score: qualifies ? contribution / validWeight : null, rank: null, previousRank: previousById.get(record.id) ?? null, rankChange: null } };
  });
  const qualified = scored.filter((record) => record.overall.qualifies).sort((a, b) =>
    b.overall.score - a.overall.score ||
    (b.kpis.revenue?.hasData ? b.kpis.revenue.value : -Infinity) - (a.kpis.revenue?.hasData ? a.kpis.revenue.value : -Infinity) ||
    a.name.localeCompare(b.name) || a.id - b.id);
  qualified.forEach((record, index) => {
    record.overall.rank = index + 1;
    record.overall.rankChange = record.overall.previousRank === null ? null : record.overall.previousRank - record.overall.rank;
  });
  return scored;
}

module.exports = { validateWeights, calculateOverallScores };
