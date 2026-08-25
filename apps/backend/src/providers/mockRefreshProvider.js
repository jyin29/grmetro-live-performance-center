"use strict";

const scenarios = require("../../test/fixtures/scenarios.json");
const technicians = require("../../../../shared/technicians");
const kpis = require("../../../../shared/kpis");
const { normalizeKpis } = require("../data/normalization/kpi");
const { buildDashboardPayload } = require("../data/dashboardBuilder");

const KPI_IDS = Object.freeze(Object.keys(kpis));
const FIXED_TIME = "2026-01-15T15:00:00.000Z";
const MOCK_GOALS = Object.freeze({
  revenue: 10000,
  billableServiceCalls: 20,
  serviceRevenue: 7000,
  opportunities: 10,
  leadsSet: 8,
  leadConversionRate: 65,
  leadAverageSale: 2500,
  leadSales: 15000,
  techLeads: 5,
  marketedLeads: 8,
  closingRate: 60,
  installs: 2,
  installAverageTicket: 8500,
  installRevenue: 17000,
  membershipsSold: 3
});

// Values follow the exact order of shared/kpis.js.
const BASE_VALUES = Object.freeze([
  Object.freeze([9200,18,6100,11,7,62,2400,14200,4,7,2,58,1,8200,8200]),
  Object.freeze([10800,22,7400,14,9,68,2800,17600,6,9,4,64,2,8800,17600]),
  Object.freeze([7600,15,5200,9,5,55,2100,10500,3,5,1,51,1,7900,7900]),
  Object.freeze([8400,17,5700,10,6,59,2250,12600,5,6,3,56,2,8100,16200]),
  Object.freeze([6900,13,4800,8,4,50,1900,7600,2,4,0,47,1,7600,7600])
]);

function clone(value) { return JSON.parse(JSON.stringify(value)); }

function scenarioValues(name) {
  const values = clone(BASE_VALUES);
  if (name === "zero-values") return values.map(() => KPI_IDS.map(() => 0));
  if (name === "missing-data") { values[1][5] = null; values[3][2] = null; return values; }
  if (name === "no-installs") {
    return values.map((row) => row.map((value, index) => index === 13 ? null : ([12,14].includes(index) ? 0 : value)));
  }
  if (name === "ranking-changes") { values[4][0] = 11500; return values; }
  if (name === "new-leader") { values[2][0] = 12500; values[2][11] = 72; return values; }
  if (name === "goal-reached") { values[0][0] = MOCK_GOALS.revenue; return values; }
  if (name === "entered-top-3") { values[4][0] = 9800; values[4][11] = 69; return values; }
  return values;
}

function buildRecords(values, definition, timestamp) {
  return technicians.map((technician, technicianIndex) => {
    const stale = definition?.staleTechnicianIndex === technicianIndex || definition?.failedTechnicianIndex === technicianIndex;
    return {
      ...technician,
      stale,
      available: definition?.failedTechnicianIndex !== technicianIndex,
      lastSuccessfulUpdate: stale ? new Date(new Date(timestamp).getTime() - 240000).toISOString() : timestamp,
      kpis: normalizeKpis({}, { mockValues: Object.fromEntries(KPI_IDS.map((id, index) => [id, values[technicianIndex][index]])) })
    };
  });
}

function baselinePayload(timestamp, goals) {
  return buildDashboardPayload(buildRecords(clone(BASE_VALUES), {}, timestamp), {
    now: timestamp,
    goals,
    rotationEpoch: "2026-01-15T05:00:00.000Z",
    status: { browser: "bypassed", serviceTitan: "bypassed", cache: "fresh", staleTechnicianCount: 0 }
  });
}

class MockRefreshProvider {
  constructor({ scenario = "normal", config, goalsProvider } = {}) {
    if (!config?.mockMode) throw new Error("MockRefreshProvider requires explicit MOCK_MODE=true configuration.");
    this.config = config;
    this.goalsProvider = goalsProvider;
    this.scenario = this.#validateScenario(scenario);
  }

  #validateScenario(name) {
    if (!Object.hasOwn(scenarios, name)) throw new Error(`Unknown mock scenario: ${name}.`);
    return name;
  }

  selectScenario(name) {
    if (this.config.nodeEnv === "production" || !this.config.developmentRoutesEnabled) throw new Error("Mock scenario selection is development-only and must be explicitly enabled.");
    this.scenario = this.#validateScenario(name);
  }

  async refresh({ now = FIXED_TIME, date, previousPayload } = {}) {
    const definition = scenarios[this.scenario];
    const timestamp = new Date(now).toISOString();
    const goals = this.goalsProvider?.() || MOCK_GOALS;
    let records = buildRecords(scenarioValues(this.scenario), definition, timestamp);

    if (definition.failedTechnicianIndex !== undefined && previousPayload) {
      const failedId = technicians[definition.failedTechnicianIndex].id;
      const retained = previousPayload.technicians?.find((record) => record.id === failedId);
      if (retained) records = records.map((record) => record.id === failedId ? { ...clone(retained), available: false, stale: true } : record);
    }

    const needsBaseline = ["ranking-changes", "new-leader", "entered-top-3"].includes(this.scenario);
    const comparisonPayload = previousPayload || (needsBaseline ? baselinePayload(timestamp, goals) : undefined);
    const status = {
      browser: "bypassed",
      serviceTitan: "bypassed",
      cache: definition.variant === "stale" ? "stale" : "fresh",
      staleTechnicianCount: records.filter((record) => record.stale).length
    };
    const payload = buildDashboardPayload(records, {
      now: timestamp,
      previousPayload: comparisonPayload,
      goals,
      rotationEpoch: "2026-01-15T05:00:00.000Z",
      status
    });

    const scenarioEvent = definition.event ? [{ type: definition.event, technicianId: payload.overallTopThree.find((entry) => entry.technicianId)?.technicianId || technicians[0].id, createdAt: timestamp }] : [];
    return {
      ...payload,
      provider: "mock",
      scenario: this.scenario,
      lastSuccessfulRefreshAt: timestamp,
      events: [...payload.events, ...scenarioEvent],
      diagnostics: {
        date: date || null,
        results: records.map((record) => ({ technicianId: record.id, ok: record.available, stale: record.stale, lastSuccessfulUpdate: record.lastSuccessfulUpdate }))
      }
    };
  }
}

module.exports = { MockRefreshProvider, MOCK_SCENARIO_NAMES: Object.freeze(Object.keys(scenarios)), FIXED_TIME };
