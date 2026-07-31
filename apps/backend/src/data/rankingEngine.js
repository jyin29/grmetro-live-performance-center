"use strict";

function previousRank(previous, technicianId, kpiId) {
  const record = previous?.find((item) => item.id === technicianId);
  return record?.kpis?.[kpiId]?.rank ?? null;
}

function rankKpis(records, previousRecords = []) {
  const output = records.map((record) => ({ ...record, kpis: Object.fromEntries(Object.entries(record.kpis).map(([id, metric]) => [id,
    { ...metric, rank: null, previousRank: previousRank(previousRecords, record.id, id), rankChange: null }
  ])) }));
  for (const kpiId of Object.keys(output[0]?.kpis || {})) {
    const ranked = output.filter((record) => record.kpis[kpiId].hasData).sort((a, b) =>
      b.kpis[kpiId].value - a.kpis[kpiId].value ||
      (b.kpis.revenue?.hasData ? b.kpis.revenue.value : -Infinity) - (a.kpis.revenue?.hasData ? a.kpis.revenue.value : -Infinity) ||
      a.name.localeCompare(b.name) || a.id - b.id);
    ranked.forEach((record, index) => {
      const metric = record.kpis[kpiId];
      metric.rank = index + 1;
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
