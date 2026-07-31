"use strict";

const configuredTechnicians = require("../../../../../shared/technicians");
const { publicTechnicianIdentity } = require("./privacy");

function normalizeTechnician(raw, configuration = configuredTechnicians) {
  const rawId = raw?.TechnicianId ?? raw?.technicianId ?? raw?.personalInfo?.id;
  const id = typeof rawId === "string" && /^\d+$/.test(rawId) ? Number(rawId) : rawId;
  const configured = configuration.find((technician) => technician.id === id);
  if (!configured) throw new RangeError(`Unconfigured technician ID: ${String(id)}.`);
  return publicTechnicianIdentity(configured);
}

module.exports = { normalizeTechnician };
