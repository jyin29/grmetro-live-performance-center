"use strict";

// Presentation records are allow-list constructed. This helper intentionally
// returns only approved identity fields and never copies arbitrary provider data.
function publicTechnicianIdentity(technician) {
  return { id: technician.id, name: technician.name, shortName: technician.shortName, initials: technician.initials };
}

module.exports = { publicTechnicianIdentity };
