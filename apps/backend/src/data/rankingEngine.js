"use strict";

function previousRank(previous, technicianId, kpiId) {
  const record = previous?.find((item) => item.id === technicianId);
  return record?.kpis?.[kpiId]?.rank ?? null;
}

function rankKpis(records, previousRecords = []) {
  const output = records.map((record) => ({ ...record, kpis: Object.fromEntries(Object.entries(record.kpis).map(([id, metric]) => [id,
    { ...metric, rank: null, rankLabel: null, tied: false, tieSize: 0,
      previousRank: previousRank(previousRecords, record.id, id), rankChange: null }
  ])) }));
  for (const kpiId of Object.keys(output[0]?.kpis || {})) {
    const ranked = output.filter((record) => record.kpis[kpiId].hasData &&
      (kpiId !== "revenue" || record.kpis[kpiId].dataQuality === "confirmed")).sort((a, b) =>
      b.kpis[kpiId].value - a.kpis[kpiId].value ||
      (b.kpis.revenue?.hasData ? b.kpis.revenue.value : -Infinity) - (a.kpis.revenue?.hasData ? a.kpis.revenue.value : -Infinity) ||
      a.name.localeCompare(b.name) || a.id - b.id);
    const tieSizes = new Map();
    ranked.forEach((record) => {
      const value = record.kpis[kpiId].value;
      tieSizes.set(value, (tieSizes.get(value) || 0) + 1);
    });
    let rank = 0;
    ranked.forEach((record, index) => {
      const metric = record.kpis[kpiId];
      if (index === 0 || metric.value !== ranked[index - 1].kpis[kpiId].value) rank = index + 1;
      metric.rank = rank;
      metric.tieSize = tieSizes.get(metric.value);
      metric.tied = metric.tieSize > 1;
      metric.rankLabel = metric.tied ? `T-${metric.rank}` : `#${metric.rank}`;
      metric.rankChange = metric.previousRank === null ? null : metric.previousRank - metric.rank;
    });
  }
  return output;
}

function sortByPrimaryKpi(records, kpiId) {
  return [...records].sort((a, b) => {
    const left = a.kpis[kpiId], right = b.kpis[kpiId];
    if (left.hasData !== right.hasData) return left.hasData ? -1 : 1;
    return (left.rank ?? Infinity) - (right.rank ?? Infinity) || a.name.localeCompare(b.name) || a.id - b.id;
  });
}

module.exports = { rankKpis, sortByPrimaryKpi };
