"use strict";

const slides = require("../../../../shared/slides");
const kpis = require("../../../../shared/kpis");
const productionGoals = require("../../../../shared/goals");
const overallScore = require("../../../../shared/overallScore");
const { applyGoals } = require("./goalEngine");
const { rankKpis, sortByPrimaryKpi } = require("./rankingEngine");
const { calculateOverallScores } = require("./overallScoreEngine");
const { buildAxis } = require("./axis");
const { activeEvents } = require("./achievementEvents");
const businessRules = require("../../../../shared/businessRules");
const { evaluateBusinessRules } = require("../rules/businessRulesEngine");

const GROUPS = Object.freeze({
  revenue: ["revenue", "serviceRevenue", "installRevenue"],
  activity: ["billableServiceCalls", "opportunities", "techLeads", "marketedLeads", "installs"],
  performance: ["leadConversionRate", "closingRate"],
  "average-ticket": ["installAverageTicket", "installRevenue", "installs"]
});
const PRIMARY = Object.freeze({ revenue: "revenue", activity: "billableServiceCalls", performance: "closingRate", "average-ticket": "installAverageTicket" });

function publicOverall(overall) {
  const { score, ...safe } = overall;
  return safe;
}

function slideRows(records, slideId, axis) {
  const metricIds = GROUPS[slideId];
  return sortByPrimaryKpi(records, PRIMARY[slideId]).map((record) => ({
    technicianId: record.id, name: record.name, shortName: record.shortName, initials: record.initials,
    primaryRank: record.kpis[PRIMARY[slideId]].rank,
    metrics: metricIds.map((id) => ({ ...record.kpis[id], normalizedRatio: record.kpis[id].hasData ? record.kpis[id].value / axis.maximum : null }))
  }));
}

function buildDashboardPayload(normalizedRecords, options = {}) {
  const timestamp = new Date(options.now || new Date()).toISOString();
  const previous = options.previousPayload?.technicians || [];
  let records = applyGoals(normalizedRecords, options.goals || productionGoals);
  records = rankKpis(records, previous);
  records = calculateOverallScores(records, options.overallScore || overallScore, previous);
  const generatedSlides = {};
  for (const slide of slides.slice(0, 4)) {
    const metricIds = GROUPS[slide.id];
    const axis = buildAxis(records.flatMap((record) => metricIds.filter((id) => slide.id !== "average-ticket" || id === "installAverageTicket").map((id) => record.kpis[id].hasData ? record.kpis[id].value : null)),
      { format: kpis[PRIMARY[slide.id]].format, percentage: slide.id === "performance" });
    generatedSlides[slide.id] = { ...slide, primaryKpiId: PRIMARY[slide.id],
      metrics: metricIds.map((id) => ({ id, label: kpis[id].label, color: kpis[id].color })), axis, rows: slideRows(records, slide.id, axis) };
  }
  const qualified = records.filter((record) => record.overall.qualifies).sort((a, b) => a.overall.rank - b.overall.rank);
  const entries = qualified.slice(0, 3).map((record) => ({ technicianId: record.id, name: record.name, shortName: record.shortName,
    initials: record.initials, ...publicOverall(record.overall), kpis: Object.fromEntries(["revenue", "billableServiceCalls", "closingRate", "leadConversionRate", "installs", "installAverageTicket"].map((id) => [id, record.kpis[id]])) }));
  while (entries.length < 3) entries.push({ placeholder: true, status: "insufficient-data" });
  generatedSlides["top-three"] = { ...slides[4], entries };
  const ruleResult = evaluateBusinessRules({ rules: (options.businessRules || businessRules).rules,
    current: records, previous, now: timestamp,
    eventDurationMilliseconds: (options.businessRules || businessRules).settings.eventDurationMilliseconds });
  const newEvents = ruleResult.events;
  const events = activeEvents([...(options.previousPayload?.events || []), ...newEvents], timestamp);
  return {
    version: 1, generatedAt: timestamp, refreshedAt: options.refreshedAt || timestamp,
    rotationEpoch: options.rotationEpoch || timestamp, status: options.status || { cache: "fresh" },
    technicians: records.map((record) => ({ ...record, overall: publicOverall(record.overall) })),
    slides: generatedSlides, overallTopThree: entries, events,
    managementInsights: ruleResult.managementInsights.slice(0, (options.businessRules || businessRules).settings.maximumAttentionItems)
  };
}

module.exports = { GROUPS, PRIMARY, buildDashboardPayload };
