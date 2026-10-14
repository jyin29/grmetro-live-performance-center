"use strict";

function validateTechnician(item, index) {
  const id = Number(item?.id);
  const name = String(item?.name || "").trim();
  if (!Number.isSafeInteger(id) || id <= 0) throw new Error(`Technician ${index + 1} must have a positive numeric id.`);
  if (!name) throw new Error(`Technician ${index + 1} must have a name.`);
  const shortName = String(item?.shortName || name.split(/\s+/)[0]).trim();
  const initials = String(item?.initials || name.split(/\s+/).map((part) => part[0]).join("").slice(0, 3)).trim().toUpperCase();
  return Object.freeze({ id, name, shortName, initials });
}

function technicianItems(parsed) {
  if (Array.isArray(parsed)) return parsed;
  if (!parsed || typeof parsed !== "object") {
    throw new Error("SERVICETITAN_TECHNICIANS_JSON must be a non-empty array or supported legacy wrapper.");
  }
  const keys = Object.keys(parsed).sort();
  const legacyWrapper = keys.length === 2 && keys[0] === "Count" && keys[1] === "value";
  if (!legacyWrapper || !Array.isArray(parsed.value) || !Number.isSafeInteger(parsed.Count) || parsed.Count !== parsed.value.length) {
    throw new Error("SERVICETITAN_TECHNICIANS_JSON uses an unsupported or inconsistent object format.");
  }
  return parsed.value;
}

function parseTechnicianConfiguration(value) {
  if (!value || !String(value).trim()) return null;
  let parsed;
  try { parsed = JSON.parse(value); }
  catch { throw new Error("SERVICETITAN_TECHNICIANS_JSON must be valid JSON."); }
  const items = technicianItems(parsed);
  if (!items.length) throw new Error("SERVICETITAN_TECHNICIANS_JSON must contain at least one technician.");
  const technicians = items.map(validateTechnician);
  const ids = technicians.map((item) => item.id);
  if (new Set(ids).size !== ids.length) throw new Error("SERVICETITAN_TECHNICIANS_JSON contains duplicate technician IDs.");
  return Object.freeze(technicians);
}

function loadTechnicianConfiguration(environment = process.env, fallback = []) {
  const configured = parseTechnicianConfiguration(environment.SERVICETITAN_TECHNICIANS_JSON);
  return configured || Object.freeze(fallback.map(validateTechnician));
}

module.exports = { loadTechnicianConfiguration, parseTechnicianConfiguration, technicianItems };
