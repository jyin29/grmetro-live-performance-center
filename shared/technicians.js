"use strict";

const { loadTechnicianConfiguration } = require("./technicianConfiguration");

// Legacy deployment fallback retained temporarily so existing installations keep
// working until SERVICETITAN_TECHNICIANS_JSON is set in their private .env file.
// New/packaged installs should always use the environment configuration instead.
const LEGACY_TECHNICIANS = [
  { id: 134926818, name: "Julio Torres", shortName: "Julio", initials: "JT" },
  { id: 3841, name: "Shamon Ward", shortName: "Shamon", initials: "SW" },
  { id: 3853, name: "Charlie E", shortName: "Charlie", initials: "CE" },
  { id: 133469538, name: "Alex K", shortName: "Alex", initials: "AK" },
  { id: 127491426, name: "Dwight", shortName: "Dwight", initials: "DW" }
];

module.exports = loadTechnicianConfiguration(process.env, LEGACY_TECHNICIANS);
