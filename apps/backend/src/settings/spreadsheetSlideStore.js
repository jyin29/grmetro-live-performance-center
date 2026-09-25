"use strict";

const fs = require("fs");
const path = require("path");

const DEFAULT_PATH = path.resolve(__dirname, "../../data/spreadsheet-slide.json");
const MAX_COLUMNS = 20;
const MAX_ROWS = 5000;
function cleanText(value, max = 120) { return String(value ?? "").trim().slice(0, max); }
function hasSpreadsheetContent(slide) { return slide?.enabled === true && Array.isArray(slide.columns) && slide.columns.length > 0 && Array.isArray(slide.rows) && slide.rows.length > 0; }

class SpreadsheetSlideStore {
  constructor({ filePath = DEFAULT_PATH } = {}) { this.filePath = filePath; this.state = this.load(); this.listeners = new Set(); this.revision = 0; }
  empty() { return { enabled: false, title: "Spreadsheet", subtitle: "Uploaded data", columns: [], rows: [], metrics: [], sourceRowCount: 0, updatedAt: null }; }
  load() { try { return { ...this.empty(), ...JSON.parse(fs.readFileSync(this.filePath, "utf8")) }; } catch { return this.empty(); } }
  isAvailable() { return hasSpreadsheetContent(this.state); }
  getPublicState() { return { available: this.isAvailable(), revision: this.revision, slide: this.state }; }
  notify() { this.revision += 1; const state = this.getPublicState(); for (const listener of this.listeners) listener(state); }
  subscribe(listener) { if (typeof listener !== "function") throw new TypeError("Spreadsheet listener must be a function."); this.listeners.add(listener); return () => this.listeners.delete(listener); }
  save(input = {}) {
    const columns = Array.isArray(input.columns) ? input.columns.slice(0, MAX_COLUMNS).map((column, index) => ({
      id: cleanText(column.id || `column-${index}`, 60), label: cleanText(column.label || column.id || `Column ${index + 1}`, 70),
      type: ["text", "number", "currency", "percent", "date"].includes(column.type) ? column.type : "text", metric: cleanText(column.metric || "", 50) || null
    })) : [];
    if (!columns.length) throw Object.assign(new Error("Spreadsheet slide requires at least one column."), { statusCode: 400 });
    const allowed = new Set(columns.map(({ id }) => id));
    const rows = Array.isArray(input.rows) ? input.rows.slice(0, MAX_ROWS).map((row) => Object.fromEntries(Object.entries(row || {}).filter(([key]) => allowed.has(key)).map(([key, value]) => [key, typeof value === "number" ? value : cleanText(value, 240)]))) : [];
    if (!rows.length) throw Object.assign(new Error("Spreadsheet slide requires at least one data row."), { statusCode: 400 });
    const metrics = Array.isArray(input.metrics) ? input.metrics.filter((metric) => allowed.has(metric.id)).slice(0, MAX_COLUMNS).map((metric) => ({ id: cleanText(metric.id, 60), label: cleanText(metric.label, 70), metric: cleanText(metric.metric, 50), type: cleanText(metric.type, 20) })) : columns.filter(({ metric }) => metric).map(({ id, label, metric, type }) => ({ id, label, metric, type }));
    this.state = { enabled: input.enabled !== false, title: cleanText(input.title || "Spreadsheet", 90), subtitle: cleanText(input.subtitle || "Uploaded data", 120), columns, rows, metrics, sourceRowCount: Math.max(rows.length, Number(input.sourceRowCount) || 0), updatedAt: new Date().toISOString() };
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true }); fs.writeFileSync(this.filePath, `${JSON.stringify(this.state)}\n`, "utf8"); this.notify(); return this.getPublicState();
  }
  clear() { this.state = { ...this.empty(), updatedAt: new Date().toISOString() }; try { fs.rmSync(this.filePath, { force: true }); } catch {} this.notify(); return this.getPublicState(); }
}
module.exports = { SpreadsheetSlideStore, hasSpreadsheetContent };
