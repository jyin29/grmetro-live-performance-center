"use strict";

const KEEPERS = Object.freeze({
  recordKey: { fields: ["Id", "JobId", "JobNumber", "jobId", "jobNumber"], type: "string" },
  technicianId: { fields: ["TechnicianId", "technicianId"], type: "number" },
  completedOn: { fields: ["CompletedOn", "completedOn", "CompletionDate", "completionDate"], type: "string" },
  revenue: { fields: ["Revenue", "revenue", "CompletedRevenue", "completedRevenue", "Total", "total"], type: "number" },
  businessUnit: { fields: ["BusinessUnit", "businessUnit"], type: "string" },
  converted: { fields: ["Converted", "converted"], type: "boolean" },
  opportunity: { fields: ["Opportunity", "opportunity"], type: "boolean" },
  split: { fields: ["Split", "split"], type: "number" },
  subtotal: { fields: ["Subtotal", "subtotal"], type: "number" },
  jobTypeId: { fields: ["JobTypeId", "jobTypeId"], type: "number" },
  jobTypeName: { fields: ["JobTypeName", "jobTypeName", "JobType", "jobType"], type: "string" },
  businessUnitId: { fields: ["BusinessUnitId", "businessUnitId"], type: "number" },
  businessUnitName: { fields: ["BusinessUnitName", "businessUnitName"], type: "string" },
  status: { fields: ["Status", "status", "JobStatus", "jobStatus"], type: "string" },
  isBillable: { fields: ["IsBillable", "isBillable", "Billable", "billable"], type: "boolean" },
  isRecall: { fields: ["IsRecall", "isRecall", "Recall", "recall"], type: "boolean" },
  isWarranty: { fields: ["IsWarranty", "isWarranty", "Warranty", "warranty"], type: "boolean" },
  isNoCharge: { fields: ["IsNoCharge", "isNoCharge", "NoCharge", "noCharge"], type: "boolean" }
});
const RETAINED_FIELDS = new Set(Object.values(KEEPERS).flatMap((entry) => entry.fields));
const SECRET_PATTERN = /(cookie|token|csrf|auth|password|session|phone|email|address|customer|location|note|memo|description|appointment|employee|dispatch|summary|invoice|technicianname)/i;
function inferType(value) { if (value === null) return "null"; if (Array.isArray(value)) return "array"; return typeof value; }
function convert(value, type) {
  if (value === undefined || value === null) return undefined;
  if (type === "number") { const n = Number(String(value).replace(/[$,%]/g, "")); return Number.isFinite(n) ? n : undefined; }
  if (type === "boolean") { if (typeof value === "boolean") return value; const text = String(value).trim().toLowerCase(); if (["true", "yes", "1"].includes(text)) return true; if (["false", "no", "0"].includes(text)) return false; return undefined; }
  return String(value);
}
function first(record, names) { for (const name of names) if (Object.hasOwn(record, name)) return record[name]; return undefined; }
function sanitizeDrilldownRecord(record) {
  const sanitized = {}; const removedFields = [];
  for (const [target, keeper] of Object.entries(KEEPERS)) {
    const value = convert(first(record, keeper.fields), keeper.type);
    if (value !== undefined) sanitized[target] = value;
  }
  for (const name of Object.keys(record)) if (!RETAINED_FIELDS.has(name) || SECRET_PATTERN.test(name)) removedFields.push(name);
  return { record: sanitized, removedFields: [...new Set(removedFields)].sort() };
}
function inspectFieldSchema(records) {
  const fields = new Map();
  for (const record of Array.isArray(records) ? records : []) {
    if (!record || typeof record !== "object" || Array.isArray(record)) continue;
    for (const [field, value] of Object.entries(record)) {
      const entry = fields.get(field) || { field, types: new Set(), presentInRecords: 0, retained: RETAINED_FIELDS.has(field) && !SECRET_PATTERN.test(field) };
      entry.types.add(inferType(value)); entry.presentInRecords += 1; fields.set(field, entry);
    }
  }
  return [...fields.values()].map((entry) => ({ field: entry.field, types: [...entry.types].sort(), presentInRecords: entry.presentInRecords, retained: entry.retained })).sort((a, b) => a.field.localeCompare(b.field));
}
function sanitizeDrilldownRecords(records) {
  const list = Array.isArray(records) ? records : [];
  const removed = new Set();
  const sanitizedRecords = list.map((record) => { const result = sanitizeDrilldownRecord(record && typeof record === "object" ? record : {}); result.removedFields.forEach((field) => removed.add(field)); return result.record; });
  return { records: sanitizedRecords, fieldSchema: inspectFieldSchema(list), removedFields: [...removed].sort(), recordCount: sanitizedRecords.length };
}
function sanitizeDatasourceMetadata(metadata) {
  const source = Array.isArray(metadata) ? metadata : (Array.isArray(metadata?.Fields) ? metadata.Fields : Array.isArray(metadata?.fields) ? metadata.fields : []);
  return source.map((field) => ({
    field: String(field?.Name ?? field?.name ?? field?.Field ?? field?.field ?? "").slice(0, 120),
    label: String(field?.DisplayName ?? field?.displayName ?? field?.Label ?? field?.label ?? field?.Title ?? field?.title ?? "").slice(0, 160),
    type: String(field?.Type ?? field?.type ?? field?.DataType ?? field?.dataType ?? "unknown").slice(0, 80)
  })).filter((field) => field.field && !SECRET_PATTERN.test(field.field) && !SECRET_PATTERN.test(field.label)).sort((a, b) => a.field.localeCompare(b.field));
}
module.exports = { sanitizeDrilldownRecord, sanitizeDrilldownRecords, inspectFieldSchema, sanitizeDatasourceMetadata };
