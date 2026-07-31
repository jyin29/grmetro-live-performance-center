"use strict";

const scenarios = require("../../test/fixtures/scenarios.json");
const technicians = require("../../../../shared/technicians");
const kpis = require("../../../../shared/kpis");
const slides = require("../../../../shared/slides");

const KPI_IDS = Object.keys(kpis);
const FIXED_TIME = "2026-01-15T15:00:00.000Z";
const MOCK_GOALS = Object.freeze({
  revenue: 10000, billableServiceCalls: 20, serviceRevenue: 7000, opportunities: 10,
  leadConversionRate: 65, techLeads: 5, marketedLeads: 8, closingRate: 60,
  installs: 2, installAverageTicket: 8500, installRevenue: 17000
});
const BASE_VALUES = [
  [9200, 18, 6100, 11, 62, 4, 7, 58, 1, 8200, 8200],
  [10800, 22, 7400, 14, 68, 6, 9, 64, 2, 8800, 17600],
  [7600, 15, 5200, 9, 55, 3, 5, 51, 1, 7900, 7900],
  [8400, 17, 5700, 10, 59, 5, 6, 56, 2, 8100, 16200],
  [6900, 13, 4800, 8, 50, 2, 4, 47, 1, 7600, 7600]
];

function clone(value) { return JSON.parse(JSON.stringify(value)); }

function scenarioValues(name) {
  const values = clone(BASE_VALUES);
  if (name === "zero-values") return values.map(() => KPI_IDS.map(() => 0));
  if (name === "missing-data") { values[1][4] = null; values[3][2] = null; return values; }
  if (name === "no-installs") {
    return values.map((row) => row.map((value, index) => [8, 9, 10].includes(index) ? (index === 9 ? null : 0) : value));
  }
  if (name === "ranking-changes") { values[4][0] = 11500; return values; }
  if (name === "new-leader") { values[2][0] = 12500; values[2][7] = 72; return values; }
  if (name === "goal-reached") { values[0][0] = MOCK_GOALS.revenue; return values; }
  if (name === "entered-top-3") { values[4][0] = 9800; values[4][7] = 69; return values; }
  return values;
}

function rankMetrics(records, previousRanks = {}) {
  for (const kpiId of KPI_IDS) {
    const ranked = records.filter((record) => record.kpis[kpiId].hasData)
      .sort((a, b) => b.kpis[kpiId].value - a.kpis[kpiId].value || a.id - b.id);
    ranked.forEach((record, index) => {
      const metric = record.kpis[kpiId];
      metric.rank = index + 1;
      metric.previousRank = previousRanks[kpiId]?.[record.id] ?? metric.rank;
      metric.rankChange = metric.previousRank - metric.rank;
    });
  }
}

function getRankSnapshot(values) {
  return Object.fromEntries(KPI_IDS.map((kpiId, kpiIndex) => [kpiId,
    Object.fromEntries(technicians.map((technician, technicianIndex) => [
      technician.id,
      values.map((row, index) => ({ index, value: row[kpiIndex] }))
        .filter(({ value }) => value !== null)
        .sort((a, b) => b.value - a.value || technicians[a.index].id - technicians[b.index].id)
        .findIndex(({ index }) => index === technicianIndex) + 1
    ]))
  ]));
}

function makeMetric(kpiId, value) {
  const hasData = value !== null;
  const goal = MOCK_GOALS[kpiId];
  return {
    id: kpiId, label: kpis[kpiId].label, shortLabel: kpis[kpiId].shortLabel,
    value, hasData, dataQuality: hasData ? "fallback" : "unavailable",
    format: kpis[kpiId].format, unit: kpis[kpiId].unit,
    goal, percentComplete: hasData ? value / goal * 100 : null,
    remaining: hasData ? Math.max(0, goal - value) : null,
    reached: hasData ? value >= goal : false, rank: null, previousRank: null, rankChange: null
  };
}

const SLIDE_KPIS = {
  revenue: ["revenue", "serviceRevenue", "installRevenue"],
  activity: ["billableServiceCalls", "opportunities", "techLeads", "marketedLeads", "installs"],
  performance: ["leadConversionRate", "closingRate"],
  "average-ticket": ["installAverageTicket", "installRevenue", "installs"]
};
const PRIMARY_KPI = { revenue: "revenue", activity: "billableServiceCalls", performance: "closingRate", "average-ticket": "installAverageTicket" };

function buildSlides(records) {
  const result = {};
  for (const slide of slides.slice(0, 4)) {
    const metricIds = SLIDE_KPIS[slide.id];
    const primaryKpiId = PRIMARY_KPI[slide.id];
    const maximum = slide.id === "performance" ? 100 : Math.max(1, ...records.flatMap((r) => metricIds.map((id) => r.kpis[id].value ?? 0)));
    result[slide.id] = {
      ...slide, primaryKpiId,
      metrics: metricIds.map((id) => ({ id, label: kpis[id].label, color: kpis[id].color })),
      axis: { minimum: 0, maximum, tickValues: [0, maximum / 2, maximum], format: kpis[primaryKpiId].format },
      rows: [...records].sort((a, b) => (b.kpis[primaryKpiId].value ?? -Infinity) - (a.kpis[primaryKpiId].value ?? -Infinity))
        .map((record) => ({ technicianId: record.id, name: record.name, shortName: record.shortName,
          initials: record.initials, primaryRank: record.kpis[primaryKpiId].rank, stale: record.stale,
          metrics: metricIds.map((id) => ({ ...record.kpis[id], normalizedRatio: record.kpis[id].hasData ? record.kpis[id].value / maximum : null })) }))
    };
  }
  result["top-three"] = { ...slides[4], entries: records.slice().sort((a, b) => a.overall.rank - b.overall.rank).slice(0, 3) };
  return result;
}

class MockRefreshProvider {
  constructor({ scenario = "normal", config } = {}) {
    if (!config?.mockMode) throw new Error("MockRefreshProvider requires explicit MOCK_MODE=true configuration.");
    this.config = config;
    this.scenario = this.#validateScenario(scenario);
  }

  #validateScenario(name) {
    if (!Object.hasOwn(scenarios, name)) throw new Error(`Unknown mock scenario: ${name}.`);
    return name;
  }

  selectScenario(name) {
    if (this.config.nodeEnv === "production" || !this.config.developmentRoutesEnabled) {
      throw new Error("Mock scenario selection is development-only and must be explicitly enabled.");
    }
    this.scenario = this.#validateScenario(name);
  }

  async refresh({ now = FIXED_TIME } = {}) {
    const definition = scenarios[this.scenario];
    const timestamp = new Date(now).toISOString();
    const values = scenarioValues(this.scenario);
    const records = technicians.map((technician, technicianIndex) => ({
      ...technician,
      stale: definition.staleTechnicianIndex === technicianIndex || definition.failedTechnicianIndex === technicianIndex,
      available: definition.failedTechnicianIndex !== technicianIndex,
      lastSuccessfulUpdate: definition.staleTechnicianIndex === technicianIndex || definition.failedTechnicianIndex === technicianIndex
        ? new Date(new Date(timestamp).getTime() - 240000).toISOString() : timestamp,
      kpis: Object.fromEntries(KPI_IDS.map((id, index) => [id, makeMetric(id, values[technicianIndex][index])]))
    }));
    rankMetrics(records, getRankSnapshot(BASE_VALUES));
    const overallOrder = [...records].sort((a, b) => b.kpis.revenue.value - a.kpis.revenue.value || a.id - b.id);
    const previousOverall = getRankSnapshot(BASE_VALUES).revenue;
    overallOrder.forEach((record, index) => {
      const rank = index + 1;
      record.overall = { score: record.kpis.revenue.percentComplete / 100, rank,
        previousRank: previousOverall[record.id], rankChange: previousOverall[record.id] - rank, qualifies: true };
    });
    const event = definition.event ? [{ type: definition.event, technicianId: overallOrder[0].id, createdAt: timestamp }] : [];
    return {
      version: 1, provider: "mock", scenario: this.scenario, generatedAt: timestamp, refreshedAt: timestamp,
      lastSuccessfulRefreshAt: timestamp, rotationEpoch: "2026-01-15T05:00:00.000Z",
      status: { browser: "bypassed", serviceTitan: "bypassed", cache: definition.variant === "stale" ? "stale" : "fresh", staleTechnicianCount: records.filter((r) => r.stale).length },
      slides: buildSlides(records), technicians: records,
      overallTopThree: overallOrder.slice(0, 3).map((record) => ({ technicianId: record.id, name: record.name, ...record.overall })),
      events: event,
      diagnostics: { results: records.map((record) => ({ technicianId: record.id, ok: record.available, stale: record.stale })) }
    };
  }
}

module.exports = { MockRefreshProvider, MOCK_SCENARIO_NAMES: Object.freeze(Object.keys(scenarios)), FIXED_TIME };
