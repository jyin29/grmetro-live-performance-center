"use strict";

const technicians = require("./technicians");
const kpis = require("./kpis");
const slides = require("./slides");
const televisions = require("./televisions");

const TV_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function hasUniqueValues(values) {
  return new Set(values).size === values.length;
}

function isValidTvId(id) {
  return typeof id === "string" && TV_ID_PATTERN.test(id) && televisions.some((tv) => tv.id === id);
}

function isValidTechnicianId(id) {
  const normalizedId = typeof id === "string" && /^\d+$/.test(id) ? Number(id) : id;
  return Number.isSafeInteger(normalizedId) && technicians.some((technician) => technician.id === normalizedId);
}

function isValidKpiId(id) {
  return typeof id === "string" && Object.hasOwn(kpis, id) && kpis[id].id === id;
}

function isValidSlideId(id) {
  return typeof id === "string" && slides.some((slide) => slide.id === id);
}

function isValidRemoteSelection(selection) {
  if (!selection || typeof selection !== "object" || Array.isArray(selection)) return false;
  const { technicianId = null, kpiId = null } = selection;
  if (technicianId === null && kpiId === null) return false;
  return (technicianId === null || isValidTechnicianId(technicianId)) &&
    (kpiId === null || isValidKpiId(kpiId));
}

function validateTechnicianConfiguration(configuration = technicians) {
  const errors = [];
  if (!Array.isArray(configuration) || configuration.length !== 5) errors.push("Exactly five technicians must be configured.");
  if (Array.isArray(configuration) && !hasUniqueValues(configuration.map(({ id }) => id))) errors.push("Technician IDs must be unique.");
  return errors;
}

function validateTelevisionConfiguration(configuration = televisions) {
  const errors = [];
  if (!Array.isArray(configuration) || configuration.length === 0) errors.push("At least one television must be configured.");
  if (Array.isArray(configuration)) {
    if (!hasUniqueValues(configuration.map(({ id }) => id))) errors.push("Television IDs must be unique.");
    if (configuration.some(({ id }) => typeof id !== "string" || !TV_ID_PATTERN.test(id))) errors.push("Television IDs must be lowercase and URL-safe.");
  }
  return errors;
}

function validateKpiConfiguration(configuration = kpis) {
  const entries = configuration && typeof configuration === "object" ? Object.entries(configuration) : [];
  const errors = [];
  if (entries.length !== 11) errors.push("Exactly eleven KPIs must be configured.");
  if (entries.some(([key, value]) => !value || value.id !== key)) errors.push("Each KPI key must match its stable ID.");
  return errors;
}

function validateSlideConfiguration(configuration = slides) {
  const errors = [];
  const expected = ["revenue", "activity", "performance", "average-ticket", "top-three"];
  if (!Array.isArray(configuration) || configuration.length !== expected.length) errors.push("Exactly five slides must be configured.");
  if (Array.isArray(configuration) && configuration.map(({ id }) => id).join(",") !== expected.join(",")) errors.push("Slide order must match the approved rotation.");
  if (Array.isArray(configuration) && configuration.some((slide, index) => slide.durationSeconds !== (index === 4 ? 25 : 15))) errors.push("Slide durations must match the approved rotation.");
  return errors;
}

function validateGoalConfiguration(configuration) {
  const errors = [];
  if (!configuration || typeof configuration !== "object") return ["Goal configuration must be an object."];
  const defaults = configuration.defaults || {};
  const overrides = configuration.technicians || {};
  for (const id of Object.keys(defaults)) if (!isValidKpiId(id)) errors.push(`Unknown default goal KPI ID: ${id}.`);
  for (const [technicianId, goals] of Object.entries(overrides)) {
    if (!isValidTechnicianId(technicianId)) errors.push(`Unknown technician goal ID: ${technicianId}.`);
    for (const id of Object.keys(goals || {})) if (!isValidKpiId(id)) errors.push(`Unknown technician goal KPI ID: ${id}.`);
  }
  return errors;
}

module.exports = {
  TV_ID_PATTERN,
  isValidTvId,
  isValidTechnicianId,
  isValidKpiId,
  isValidSlideId,
  isValidRemoteSelection,
  validateTechnicianConfiguration,
  validateTelevisionConfiguration,
  validateKpiConfiguration,
  validateSlideConfiguration,
  validateGoalConfiguration
};
