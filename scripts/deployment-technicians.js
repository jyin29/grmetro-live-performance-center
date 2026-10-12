"use strict";

const { loadTechnicianConfiguration } = require("../shared/technicianConfiguration");

// Public-package fallback only. Real names and ServiceTitan IDs are loaded from
// the destination machine's private SERVICETITAN_TECHNICIANS_JSON configuration.
const DEPLOYMENT_PLACEHOLDERS = [
  { id: 100000001, name: "Technician 1", shortName: "Technician 1", initials: "T1" },
  { id: 100000002, name: "Technician 2", shortName: "Technician 2", initials: "T2" },
  { id: 100000003, name: "Technician 3", shortName: "Technician 3", initials: "T3" },
  { id: 100000004, name: "Technician 4", shortName: "Technician 4", initials: "T4" },
  { id: 100000005, name: "Technician 5", shortName: "Technician 5", initials: "T5" }
];

module.exports = loadTechnicianConfiguration(process.env, DEPLOYMENT_PLACEHOLDERS);
