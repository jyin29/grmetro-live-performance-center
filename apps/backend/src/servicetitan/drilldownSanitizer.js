"use strict";

const KEEPERS = Object.freeze({
  recordKey: ["Id", "JobId", "JobNumber", "jobId", "jobNumber"],
  technicianId: ["TechnicianId", "technicianId"],
  jobTypeId: ["JobTypeId", "jobTypeId"],
  jobTypeName: ["JobTypeName", "jobTypeName", "JobType", "jobType"],
  businessUnitId: ["BusinessUnitId", "businessUnitId"],
  businessUnitName: ["BusinessUnitName", "businessUnitName"],
  status: ["Status", "status", "JobStatus", "jobStatus"],
  completedOn: ["CompletedOn", "completedOn", "CompletionDate", "completionDate"],
  revenue: ["Revenue", "revenue", "CompletedRevenue", "completedRevenue", "Total", "total"],
  isBillable: ["IsBillable", "isBillable", "Billable", "billable"],
  isRecall: ["IsRecall", "isRecall", "Recall", "recall"],
  isWarranty: ["IsWarranty", "isWarranty", "Warranty", "warranty"],
  isNoCharge: ["IsNoCharge", "isNoCharge", "NoCharge", "noCharge"],
  invoiceSubtotal: ["InvoiceSubtotal", "invoiceSubtotal"],
  invoiceTotal: ["InvoiceTotal", "invoiceTotal"]
});
const SECRET_PATTERN = /(cookie|token|csrf|auth|password|session|phone|email|address|customer|location|note|memo|description|appointment|employee|dispatch|summary)/i;
function first(record, names) { for (const name of names) if (Object.hasOwn(record, name)) return record[name]; return undefined; }
function sanitizeDrilldownRecord(record) {
  const sanitized = {}; const removedFields = [];
  for (const [target, names] of Object.entries(KEEPERS)) {
    const value = first(record, names);
    if (value !== undefined && value !== null) sanitized[target] = value;
  }
  for (const name of Object.keys(record)) if (!Object.values(KEEPERS).some((names) => names.includes(name)) || SECRET_PATTERN.test(name)) removedFields.push(name);
  return { record: sanitized, removedFields: [...new Set(removedFields)].sort() };
}
function sanitizeDrilldownRecords(records) {
  const list = Array.isArray(records) ? records : [];
  const removed = new Set();
  const sanitizedRecords = list.map((record) => { const result = sanitizeDrilldownRecord(record && typeof record === "object" ? record : {}); result.removedFields.forEach((field) => removed.add(field)); return result.record; });
  return { records: sanitizedRecords, removedFields: [...removed].sort(), recordCount: sanitizedRecords.length };
}
module.exports = { sanitizeDrilldownRecord, sanitizeDrilldownRecords };
