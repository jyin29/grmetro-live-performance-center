"use strict";

const fs = require("node:fs");
const path = require("node:path");
const presentationConfig = require("../../../../shared/presentation.json");

const METRIC_CATALOG = Object.freeze({
  slide2: ["opportunities","techLeads","marketedLeads","membershipsSold","closingRate"],
  slide3: ["revenue","closingRate","billableServiceCalls","installRevenue","installAverageTicket","opportunities","techLeads","marketedLeads","membershipsSold","serviceRevenue","leadsSet","leadConversionRate","leadAverageSale","leadSales","installs"],
  slide4: ["billableServiceCalls","opportunities","membershipsSold","installs","installAverageTicket","installRevenue"]
});
const DISPLAY_IDS = Object.freeze(presentationConfig.displays.map(({ id }) => id));
const DEFAULT_ENABLED = Object.freeze({
  slide2: new Set(METRIC_CATALOG.slide2),
  slide3: new Set(["revenue","closingRate","billableServiceCalls","installRevenue","installAverageTicket","opportunities","techLeads","marketedLeads","membershipsSold"]),
  slide4: new Set(METRIC_CATALOG.slide4)
});
const DEFAULT_SETTINGS = Object.freeze({
  metrics: Object.fromEntries(Object.entries(METRIC_CATALOG).map(([slideId, metrics]) => [slideId, Object.fromEntries(metrics.map((id) => [id, DEFAULT_ENABLED[slideId].has(id)]))])),
  displayPreferences: Object.fromEntries(DISPLAY_IDS.map((id) => [id, { controlsLauncherVisible: true }]))
});

function cloneDefaults() { return JSON.parse(JSON.stringify(DEFAULT_SETTINGS)); }
function validateSettings(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new TypeError("Display settings must be an object.");
  const result = cloneDefaults();
  const metrics = input.metrics;
  if (metrics !== undefined) {
    if (!metrics || typeof metrics !== "object" || Array.isArray(metrics)) throw new TypeError("metrics must be an object.");
    for (const [slideId, values] of Object.entries(metrics)) {
      if (!METRIC_CATALOG[slideId]) throw new TypeError(`Unknown slide settings: ${slideId}.`);
      if (!values || typeof values !== "object" || Array.isArray(values)) throw new TypeError(`${slideId} metric settings must be an object.`);
      for (const [metricId, enabled] of Object.entries(values)) {
        if (!METRIC_CATALOG[slideId].includes(metricId)) continue;
        if (typeof enabled !== "boolean") throw new TypeError(`${slideId}.${metricId} must be true or false.`);
        result.metrics[slideId][metricId] = enabled;
      }
    }
  }
  const preferences = input.displayPreferences;
  if (preferences !== undefined) {
    if (!preferences || typeof preferences !== "object" || Array.isArray(preferences)) throw new TypeError("displayPreferences must be an object.");
    for (const [displayId, preference] of Object.entries(preferences)) {
      if (!DISPLAY_IDS.includes(displayId)) throw new TypeError(`Unknown display preference: ${displayId}.`);
      if (!preference || typeof preference !== "object" || Array.isArray(preference)) throw new TypeError(`${displayId} preferences must be an object.`);
      if (preference.controlsLauncherVisible !== undefined) {
        if (typeof preference.controlsLauncherVisible !== "boolean") throw new TypeError(`${displayId}.controlsLauncherVisible must be true or false.`);
        result.displayPreferences[displayId].controlsLauncherVisible = preference.controlsLauncherVisible;
      }
    }
  }
  return result;
}

class DisplaySettingsStore {
  constructor({ filePath = path.resolve(process.cwd(), "data/display-settings.json"), fsImpl = fs } = {}) {
    this.filePath = filePath; this.fs = fsImpl; this.settings = cloneDefaults(); this.load();
  }
  load() { try { this.settings = validateSettings(JSON.parse(this.fs.readFileSync(this.filePath, "utf8"))); } catch (error) { if (error.code !== "ENOENT") throw error; } }
  getPublicState() { return { settings: JSON.parse(JSON.stringify(this.settings)), metricCatalog: METRIC_CATALOG }; }
  persist() { this.fs.mkdirSync(path.dirname(this.filePath), { recursive: true }); const temporary = `${this.filePath}.tmp`; this.fs.writeFileSync(temporary, `${JSON.stringify(this.settings, null, 2)}\n`, { mode: 0o600 }); this.fs.renameSync(temporary, this.filePath); }
  save(input) { this.settings = validateSettings(input); this.persist(); return this.getPublicState(); }
  setControlsLauncherVisible(displayId, visible) {
    if (!DISPLAY_IDS.includes(displayId)) throw new TypeError("Invalid display ID.");
    if (typeof visible !== "boolean") throw new TypeError("controlsLauncherVisible must be true or false.");
    this.settings.displayPreferences[displayId].controlsLauncherVisible = visible; this.persist(); return this.getPublicState();
  }
}

module.exports = { DEFAULT_SETTINGS, DISPLAY_IDS, METRIC_CATALOG, DisplaySettingsStore, validateSettings };
