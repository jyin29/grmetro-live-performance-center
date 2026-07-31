"use strict";

// Provisional values from PROJECT_SPEC.md section 128. Management approval is
// required before these values are used for a production launch.
module.exports = Object.freeze({
  approvalStatus: "provisional-requires-management-approval",
  minimumValidWeight: 0.6,
  contributionCap: 1.5,
  weights: Object.freeze({
    revenue: 0.30,
    billableServiceCalls: 0.15,
    serviceRevenue: 0.10,
    opportunities: 0.10,
    leadConversionRate: 0.10,
    techLeads: 0.05,
    marketedLeads: 0.05,
    closingRate: 0.10,
    installs: 0.025,
    installAverageTicket: 0.0125,
    installRevenue: 0.0125
  })
});
