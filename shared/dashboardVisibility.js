"use strict";

const { createHash } = require("node:crypto");

// Presentation exclusions use fingerprints of stable ServiceTitan technician IDs.
// Removing a fingerprint reverses the policy without changing collection or history.
const EXCLUDED_TECHNICIAN_ID_FINGERPRINTS = Object.freeze([
  "35ADF675421ED778FADD002BDD8B3D55B46F401B0F5C30916D5F178453F34634"
]);
const excludedFingerprints = new Set(EXCLUDED_TECHNICIAN_ID_FINGERPRINTS);

function technicianIdFingerprint(value) {
  const text = String(value ?? "").trim();
  if (!/^\d+$/.test(text)) return null;
  return createHash("sha256").update(text).digest("hex").toUpperCase();
}

function isTechnicianExcluded(technicianId) {
  const fingerprint = technicianIdFingerprint(technicianId);
  return fingerprint !== null && excludedFingerprints.has(fingerprint);
}

function visibleTechnicians(technicians = []) {
  return Array.isArray(technicians) ? technicians.filter((technician) => !isTechnicianExcluded(technician?.id)) : [];
}

function normalizeIdentity(value) {
  return String(value ?? "").trim().replace(/\s+/g, " ").toLocaleLowerCase("en-US");
}

function excludedTechnicianNames(technicians = []) {
  return new Set((Array.isArray(technicians) ? technicians : [])
    .filter((technician) => isTechnicianExcluded(technician?.id))
    .map((technician) => normalizeIdentity(technician?.name))
    .filter(Boolean));
}

function spreadsheetIdentityKind(column = {}) {
  const text = `${column.id || ""} ${column.label || ""}`.toLocaleLowerCase("en-US");
  if (/(?:technician|employee|tech)\s*(?:id|number)|(?:id|number)\s*(?:technician|employee|tech)/.test(text)) return "id";
  if (column.metric === "technician" || /technician|tech name|employee|team member|installer|comfort advisor/.test(text)) return "name";
  return null;
}

function filterSpreadsheetRows(slide, technicians = []) {
  if (!slide || !Array.isArray(slide.columns) || !Array.isArray(slide.rows)) return slide;
  const identityColumns = slide.columns.map((column) => ({ column, kind: spreadsheetIdentityKind(column) })).filter(({ kind }) => kind);
  if (!identityColumns.length) return slide;
  const aliases = excludedTechnicianNames(technicians);
  const rows = slide.rows.filter((row) => {
    const idValues = identityColumns.filter(({ kind }) => kind === "id").map(({ column }) => row?.[column.id]).filter((value) => String(value ?? "").trim());
    if (idValues.length) return !idValues.some(isTechnicianExcluded);
    return !identityColumns.filter(({ kind }) => kind === "name").some(({ column }) => aliases.has(normalizeIdentity(row?.[column.id])));
  });
  return rows.length === slide.rows.length ? slide : { ...slide, rows };
}

module.exports = {
  EXCLUDED_TECHNICIAN_ID_FINGERPRINTS,
  excludedTechnicianNames,
  filterSpreadsheetRows,
  isTechnicianExcluded,
  normalizeIdentity,
  spreadsheetIdentityKind,
  technicianIdFingerprint,
  visibleTechnicians
};
