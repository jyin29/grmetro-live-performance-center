"use strict";

const fs = require("fs");
const path = require("path");

const DEFAULT_PATH = path.resolve(__dirname, "../../data/spreadsheet-slide.json");

function cleanText(value, max = 80) { return String(value ?? "").trim().slice(0, max); }

class SpreadsheetSlideStore {
  constructor({ filePath = DEFAULT_PATH } = {}) { this.filePath = filePath; this.state = this.load(); }
  load() {
    try { return JSON.parse(fs.readFileSync(this.filePath, "utf8")); }
    catch { return { enabled: false, title: "Spreadsheet", subtitle: "Uploaded data", columns: [], rows: [], updatedAt: null }; }
  }
  getPublicState() { return { slide: this.state }; }
  save(input = {}) {
    const columns = Array.isArray(input.columns) ? input.columns.slice(0, 8).map((column, index) => ({
      id: cleanText(column.id || `column-${index}`, 50), label: cleanText(column.label || column.id || `Column ${index + 1}`, 50),
      type: ["text", "number", "currency", "percent", "date"].includes(column.type) ? column.type : "text"
    })) : [];
    if (!columns.length) throw Object.assign(new Error("Spreadsheet slide requires at least one column."), { statusCode: 400 });
    const allowed = new Set(columns.map(({ id }) => id));
    const rows = Array.isArray(input.rows) ? input.rows.slice(0, 30).map((row) => Object.fromEntries(Object.entries(row || {}).filter(([key]) => allowed.has(key)).map(([key, value]) => [key, typeof value === "number" ? value : cleanText(value, 120)]))) : [];
    if (!rows.length) throw Object.assign(new Error("Spreadsheet slide requires at least one data row."), { statusCode: 400 });
    this.state = { enabled: input.enabled !== false, title: cleanText(input.title || "Spreadsheet", 70), subtitle: cleanText(input.subtitle || "Uploaded data", 100), columns, rows, updatedAt: new Date().toISOString() };
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    fs.writeFileSync(this.filePath, `${JSON.stringify(this.state, null, 2)}\n`, "utf8");
    return this.getPublicState();
  }
  clear() {
    this.state = { enabled: false, title: "Spreadsheet", subtitle: "Uploaded data", columns: [], rows: [], updatedAt: new Date().toISOString() };
    try { fs.rmSync(this.filePath, { force: true }); } catch { /* optional local state */ }
    return this.getPublicState();
  }
}

module.exports = { SpreadsheetSlideStore };
