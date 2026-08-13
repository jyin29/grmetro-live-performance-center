"use strict";

const fs = require("node:fs");
const path = require("node:path");
const configuredGoals = require("../../../../shared/goals");

const EDITABLE_GOALS = Object.freeze([
  "revenue", "closingRate", "billableServiceCalls",
  "installRevenue", "installAverageTicket", "membershipsSold", "opportunities"
]);

function validateGoals(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new TypeError("Goals must be an object.");
  const result = {};
  for (const id of EDITABLE_GOALS) {
    const value = input[id];
    if (value === undefined) continue;
    if (value !== null && (!Number.isFinite(value) || value < 0)) throw new TypeError(`${id} must be a nonnegative number or null.`);
    result[id] = value;
  }
  if (Object.keys(result).length !== Object.keys(input).length) throw new TypeError("One or more goal IDs are not editable.");
  return result;
}

class GoalStore {
  constructor({ filePath = path.resolve(process.cwd(), "data/goals.json"), fsImpl = fs } = {}) {
    this.filePath = filePath;
    this.fs = fsImpl;
    this.overrides = {};
    this.load();
  }
  load() {
    try { this.overrides = validateGoals(JSON.parse(this.fs.readFileSync(this.filePath, "utf8"))); }
    catch (error) { if (error.code !== "ENOENT") throw error; }
  }
  getGoals() { return { ...configuredGoals.defaults, ...this.overrides }; }
  getPublicState() { return { goals: this.getGoals(), editableGoalIds: EDITABLE_GOALS }; }
  save(input) {
    this.overrides = { ...this.overrides, ...validateGoals(input) };
    this.fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    const temporary = `${this.filePath}.tmp`;
    this.fs.writeFileSync(temporary, `${JSON.stringify(this.overrides, null, 2)}\n`, { mode: 0o600 });
    this.fs.renameSync(temporary, this.filePath);
    return this.getPublicState();
  }
}

module.exports = { EDITABLE_GOALS, GoalStore, validateGoals };
