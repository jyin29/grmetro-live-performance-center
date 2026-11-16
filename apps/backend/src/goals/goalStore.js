"use strict";

const fs = require("node:fs");
const path = require("node:path");
const configuredGoals = require("../../../../shared/goals");
const kpis = require("../../../../shared/kpis");
const technicians = require("../../../../shared/technicians");
const { DEFAULT_GOAL_SCHEDULE, normalizeGoalSchedule, workingDates } = require("../reporting/reportingPeriods");

const EDITABLE_GOALS = Object.freeze(["revenue","closingRate","billableServiceCalls","installRevenue","installAverageTicket","membershipsSold","opportunities"]);
const PERIODS = Object.freeze(["today","yesterday","wtd","last-week","mtd","last-month","qtd","last-quarter","ytd","last-year","last-7-days","last-30-days"]);
const TECH_IDS = new Set(technicians.map((technician) => String(technician.id)));

function validateGoalValues(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new TypeError("Goals must be an object.");
  const result = {};
  for (const [id, value] of Object.entries(input)) {
    if (!EDITABLE_GOALS.includes(id)) throw new TypeError(`${id} is not editable.`);
    if (value !== null && (!Number.isFinite(value) || value < 0)) throw new TypeError(`${id} must be a nonnegative number or null.`);
    result[id] = value;
  }
  return result;
}
function validatePeriod(input = {}) {
  const defaults = validateGoalValues(input.defaults || {}), technicianGoals = {};
  for (const [id, values] of Object.entries(input.technicians || {})) {
    if (!TECH_IDS.has(String(id))) throw new TypeError(`Unknown technician goal override: ${id}.`);
    technicianGoals[String(id)] = validateGoalValues(values);
  }
  return { defaults, technicians: technicianGoals };
}
function validateGoals(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new TypeError("Goals must be an object.");
  const schedule = normalizeGoalSchedule(input.schedule || configuredGoals.schedule || DEFAULT_GOAL_SCHEDULE);
  if (Object.hasOwn(input, "periods")) {
    const periods = {};
    for (const [period, value] of Object.entries(input.periods || {})) {
      if (!PERIODS.includes(period)) throw new TypeError(`Unknown goal period: ${period}.`);
      periods[period] = validatePeriod(value);
    }
    return { schedule, periods };
  }
  const structured = Object.hasOwn(input, "defaults") || Object.hasOwn(input, "technicians");
  return { schedule, periods: { today: structured ? validatePeriod(input) : { defaults: validateGoalValues(input), technicians: {} } } };
}
function configuredNumber(value) { return typeof value === "number" && Number.isFinite(value) ? value : null; }
function aggregateDailyGoal(id, value, workingDayCount) {
  const numeric = configuredNumber(value);
  if (numeric === null) return null;
  if (kpis[id]?.goalAggregation === "average") return numeric;
  return workingDayCount > 0 ? numeric * workingDayCount : null;
}
function resolveValue(values, id) { return values && Object.hasOwn(values, id) ? configuredNumber(values[id]) : null; }

class GoalStore {
  constructor({ filePath = path.resolve(process.cwd(), "data/goals.json"), fsImpl = fs } = {}) {
    this.filePath = filePath;
    this.fs = fsImpl;
    this.overrides = { schedule: normalizeGoalSchedule(configuredGoals.schedule || DEFAULT_GOAL_SCHEDULE), periods: {} };
    this.load();
  }
  load() {
    try { this.overrides = validateGoals(JSON.parse(this.fs.readFileSync(this.filePath, "utf8"))); }
    catch (error) { if (error.code !== "ENOENT") throw error; }
  }
  getSchedule() { return normalizeGoalSchedule(this.overrides.schedule || configuredGoals.schedule || DEFAULT_GOAL_SCHEDULE); }
  getPeriod(period = "today", dateRange = null) {
    const dailySaved = this.overrides.periods?.today || { defaults: {}, technicians: {} };
    const dailyDefaults = { ...(configuredGoals.defaults || {}), ...(dailySaved.defaults || {}) };
    const dailyTechnicians = dailySaved.technicians || {};
    const dedicated = period === "today" ? dailySaved : (this.overrides.periods?.[period] || { defaults: {}, technicians: {} });
    const count = period === "today" ? 1 : (dateRange ? workingDates(dateRange, this.getSchedule()).length : 0);
    const defaults = {}, sources = { defaults: {}, technicians: {} };
    const metricIds = [...new Set([...EDITABLE_GOALS, ...Object.keys(dailyDefaults), ...Object.keys(dedicated.defaults || {})])];
    for (const id of metricIds) {
      const explicit = resolveValue(dedicated.defaults, id);
      defaults[id] = explicit !== null ? explicit : aggregateDailyGoal(id, dailyDefaults[id], count);
      sources.defaults[id] = explicit !== null ? "dedicated" : (defaults[id] === null ? "unconfigured" : "daily-aggregate");
    }
    const technicianGoals = {};
    for (const technician of technicians) {
      const techId = String(technician.id), values = {}, techSources = {};
      for (const id of metricIds) {
        const dedicatedTech = resolveValue(dedicated.technicians?.[techId], id);
        if (dedicatedTech !== null) { values[id] = dedicatedTech; techSources[id] = "dedicated"; continue; }
        const dedicatedDefault = resolveValue(dedicated.defaults, id);
        if (dedicatedDefault !== null) continue;
        const dailyTech = resolveValue(dailyTechnicians[techId], id);
        if (dailyTech !== null) { values[id] = aggregateDailyGoal(id, dailyTech, count); techSources[id] = "daily-aggregate"; }
      }
      if (Object.keys(values).length) technicianGoals[techId] = values;
      if (Object.keys(techSources).length) sources.technicians[techId] = techSources;
    }
    return { defaults, technicians: technicianGoals, sources, workingDayCount: count, schedule: this.getSchedule() };
  }
  getGoals(period = "today", dateRange = null) {
    const resolved = this.getPeriod(period, dateRange);
    return { ...resolved.defaults, defaults: resolved.defaults, technicians: resolved.technicians, goalSources: resolved.sources, workingDayCount: resolved.workingDayCount, schedule: resolved.schedule };
  }
  getPublicState(period = "today", dateRange = null) {
    const resolved = this.getPeriod(period, dateRange);
    return { period, periods: PERIODS, goals: resolved.defaults, technicianGoals: resolved.technicians, goalSources: resolved.sources, workingDayCount: resolved.workingDayCount, schedule: resolved.schedule, editableGoalIds: EDITABLE_GOALS, technicians: technicians.map(({ id, name, shortName }) => ({ id, name, shortName })) };
  }
  save(input, period = "today") {
    const incoming = validateGoals(input);
    if (input.schedule) this.overrides.schedule = incoming.schedule;
    for (const [savedPeriod, value] of Object.entries(incoming.periods)) {
      const current = this.overrides.periods[savedPeriod] || { defaults: {}, technicians: {} };
      this.overrides.periods[savedPeriod] = { defaults: { ...current.defaults, ...value.defaults }, technicians: { ...current.technicians, ...Object.fromEntries(Object.entries(value.technicians).map(([id, values]) => [id, { ...(current.technicians[id] || {}), ...values }])) } };
    }
    this.fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    const temporary = `${this.filePath}.tmp`;
    this.fs.writeFileSync(temporary, `${JSON.stringify(this.overrides, null, 2)}\n`, { mode: 0o600 });
    this.fs.renameSync(temporary, this.filePath);
    return this.getPublicState(period);
  }
}

module.exports = { EDITABLE_GOALS, PERIODS, GoalStore, aggregateDailyGoal, validateGoals };
