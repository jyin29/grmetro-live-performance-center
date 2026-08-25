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

function parseTechnicianConfiguration(value) {
  if (!value || !String(value).trim()) return null;
  let parsed;
  try { parsed = JSON.parse(value); }
  catch { throw new Error("SERVICETITAN_TECHNICIANS_JSON must be valid JSON."); }
  if (!Array.isArray(parsed) || !parsed.length) throw new Error("SERVICETITAN_TECHNICIANS_JSON must be a non-empty array.");
  const technicians = parsed.map(validateTechnician);
  const ids = technicians.map((item) => item.id);
  if (new Set(ids).size !== ids.length) throw new Error("SERVICETITAN_TECHNICIANS_JSON contains duplicate technician IDs.");
  return Object.freeze(technicians);
}

function loadTechnicianConfiguration(environment = process.env, fallback = []) {
  const configured = parseTechnicianConfiguration(environment.SERVICETITAN_TECHNICIANS_JSON);
  return configured || Object.freeze(fallback.map(validateTechnician));
}

module.exports = { loadTechnicianConfiguration, parseTechnicianConfiguration };
