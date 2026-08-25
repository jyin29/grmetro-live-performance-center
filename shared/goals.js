"use strict";

const { loadCompanyConfig } = require("./companyConfig");

const companyConfig = loadCompanyConfig();
const configured = companyConfig.goals || {};
const defaults = {
  revenue: null,
  billableServiceCalls: null,
  serviceRevenue: null,
  opportunities: null,
  leadConversionRate: null,
  techLeads: null,
  marketedLeads: null,
  closingRate: null,
  installs: null,
  installAverageTicket: null,
  installRevenue: null,
  ...(configured.defaults || {})
};
const technicians = Object.fromEntries((companyConfig.technicians || []).map((technician) => [String(technician.id), {}]));

module.exports = {
  defaults,
  technicians: { ...technicians, ...(configured.technicians || {}) }
};
