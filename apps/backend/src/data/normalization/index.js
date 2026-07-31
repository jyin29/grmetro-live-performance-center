"use strict";

const { normalizeTechnician } = require("./technician");
const { normalizeKpis } = require("./kpi");

function normalizeServiceTitanTechnician(raw, options = {}) {
  return { ...normalizeTechnician(raw, options.technicians), kpis: normalizeKpis(raw, options) };
}

module.exports = { normalizeServiceTitanTechnician };
