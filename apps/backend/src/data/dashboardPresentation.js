"use strict";

const { isTechnicianExcluded, visibleTechnicians } = require("../../../../shared/dashboardVisibility");

const TOP_METRICS = ["revenue", "billableServiceCalls", "closingRate", "leadConversionRate", "installs", "installAverageTicket"];

function compactPreviousRanks(records, readRank) {
  const ranked = records.map((record) => ({ record, oldRank: readRank(record) }))
    .filter(({ oldRank }) => Number.isInteger(oldRank) && oldRank > 0)
    .sort((left, right) => left.oldRank - right.oldRank || String(left.record.name).localeCompare(String(right.record.name)));
  const result = new Map();
  let rank = 0;
  ranked.forEach((entry, index) => {
    if (index === 0 || entry.oldRank !== ranked[index - 1].oldRank) rank = index + 1;
    result.set(String(entry.record.id), rank);
  });
  return result;
}

function projectTechnicians(technicians = []) {
  const records = visibleTechnicians(technicians).map((record) => ({
    ...record,
    kpis: Object.fromEntries(Object.entries(record.kpis || {}).map(([id, metric]) => [id, { ...metric }])),
    overall: record.overall ? { ...record.overall } : record.overall
  }));
  const kpiIds = [...new Set(records.flatMap((record) => Object.keys(record.kpis || {})))];
  for (const kpiId of kpiIds) {
    const previous = compactPreviousRanks(records, (record) => record.kpis?.[kpiId]?.previousRank);
    const ranked = records.filter((record) => record.kpis?.[kpiId]?.hasData &&
      (kpiId !== "revenue" || record.kpis[kpiId].dataQuality === "confirmed")).sort((left, right) =>
      right.kpis[kpiId].value - left.kpis[kpiId].value ||
      (right.kpis.revenue?.hasData ? right.kpis.revenue.value : -Infinity) - (left.kpis.revenue?.hasData ? left.kpis.revenue.value : -Infinity) ||
      String(left.name).localeCompare(String(right.name)) || Number(left.id) - Number(right.id));
    const tieSizes = new Map();
    ranked.forEach((record) => tieSizes.set(record.kpis[kpiId].value, (tieSizes.get(record.kpis[kpiId].value) || 0) + 1));
    let rank = 0;
    ranked.forEach((record, index) => {
      const metric = record.kpis[kpiId];
      if (index === 0 || metric.value !== ranked[index - 1].kpis[kpiId].value) rank = index + 1;
      metric.rank = rank;
      metric.tieSize = tieSizes.get(metric.value);
      metric.tied = metric.tieSize > 1;
      metric.rankLabel = metric.tied ? `T-${rank}` : `#${rank}`;
      metric.previousRank = previous.get(String(record.id)) ?? null;
      metric.rankChange = metric.previousRank === null ? null : metric.previousRank - rank;
    });
  }
  const previousOverall = compactPreviousRanks(records, (record) => record.overall?.previousRank);
  const qualified = records.filter((record) => record.overall?.qualifies && Number.isInteger(record.overall.rank))
    .map((record) => ({ record, oldRank: record.overall.rank }))
    .sort((left, right) => left.oldRank - right.oldRank || String(left.record.name).localeCompare(String(right.record.name)) || Number(left.record.id) - Number(right.record.id));
  let overallRank = 0;
  qualified.forEach((entry, index) => {
    const { record, oldRank } = entry;
    if (index === 0 || oldRank !== qualified[index - 1].oldRank) overallRank = index + 1;
    const tieSize = qualified.filter((candidate) => candidate.oldRank === oldRank).length;
    record.overall.rank = overallRank;
    record.overall.tieSize = tieSize;
    record.overall.tied = tieSize > 1;
    record.overall.rankLabel = tieSize > 1 ? `T-${overallRank}` : `#${overallRank}`;
    record.overall.previousRank = previousOverall.get(String(record.id)) ?? null;
    record.overall.rankChange = record.overall.previousRank === null ? null : record.overall.previousRank - overallRank;
  });
  return records;
}

function projectSlides(slides = {}, technicians = []) {
  const byId = new Map(technicians.map((technician) => [String(technician.id), technician]));
  const projected = Object.fromEntries(Object.entries(slides || {}).map(([id, slide]) => {
    if (!Array.isArray(slide?.rows)) return [id, slide];
    const rows = slide.rows.filter((row) => byId.has(String(row.technicianId))).map((row) => {
      const technician = byId.get(String(row.technicianId));
      return {
        ...row,
        primaryRank: technician.kpis?.[slide.primaryKpiId]?.rank ?? null,
        metrics: Array.isArray(row.metrics) ? row.metrics.map((metric) => ({ ...metric, ...(technician.kpis?.[metric.id] || {}) })) : row.metrics
      };
    }).sort((left, right) => (left.primaryRank ?? Infinity) - (right.primaryRank ?? Infinity) || String(left.name).localeCompare(String(right.name)));
    return [id, { ...slide, rows }];
  }));
  return projected;
}

function topThree(technicians = []) {
  const entries = technicians.filter((record) => record.overall?.qualifies && record.overall.rank)
    .sort((left, right) => left.overall.rank - right.overall.rank || String(left.name).localeCompare(String(right.name))).slice(0, 3)
    .map((record) => ({ technicianId: record.id, name: record.name, shortName: record.shortName, initials: record.initials,
      ...record.overall, kpis: Object.fromEntries(TOP_METRICS.map((id) => [id, record.kpis?.[id]])) }));
  while (entries.length < 3) entries.push({ placeholder: true, status: "insufficient-data" });
  return entries;
}

function filterHistorical(value) {
  if (!value?.technicians || typeof value.technicians !== "object") return value;
  return { ...value, technicians: Object.fromEntries(Object.entries(value.technicians).filter(([id]) => !isTechnicianExcluded(id))) };
}

function projectDashboardPayload(payload) {
  if (!payload || typeof payload !== "object") return payload;
  const technicians = projectTechnicians(payload.technicians);
  const slides = projectSlides(payload.slides, technicians);
  const entries = topThree(technicians);
  if (slides["top-three"]) slides["top-three"] = { ...slides["top-three"], entries };
  const projected = {
    ...payload,
    technicians,
    slides,
    events: Array.isArray(payload.events) ? payload.events.filter((event) => !isTechnicianExcluded(event?.technicianId)) : payload.events,
    managementInsights: Array.isArray(payload.managementInsights) ? payload.managementInsights.filter((insight) => !isTechnicianExcluded(insight?.technicianId)) : payload.managementInsights,
    historicalComparison: filterHistorical(payload.historicalComparison),
    historicalTrends: filterHistorical(payload.historicalTrends)
  };
  if (Object.hasOwn(payload, "overallTopThree")) projected.overallTopThree = entries;
  return projected;
}

module.exports = { projectDashboardPayload, projectSlides, projectTechnicians, topThree };
