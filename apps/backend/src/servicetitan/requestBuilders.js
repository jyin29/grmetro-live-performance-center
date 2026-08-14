"use strict";

const { TECHNICIAN_DATASOURCE_FIELD_STRING } = require("./fields");
const { dateInTimeZone } = require("../refresh/refreshScheduler");

function values(config, technicianId, now, dateRange) {
  if (!config || !Array.isArray(config.businessUnitIds)) throw new TypeError("ServiceTitan request configuration is required.");
  if (!Number.isSafeInteger(Number(technicianId))) throw new TypeError("A numeric technician ID is required.");
  const date = dateInTimeZone(now instanceof Date ? now : new Date(now), config.timeZone);
  const from = dateRange?.from || date;
  const to = dateRange?.to || date;
  return { date, from, to, technicianId: Number(technicianId), units: [...config.businessUnitIds], csv: config.businessUnitIds.join(",") };
}
function buildTechnicianOverviewRequest(config, technicianId, now = new Date(), dateRange) {
  const v = values(config, technicianId, now, dateRange);
  return { from: v.from, to: v.to, businessUnitIds: v.units, reloadKey: config.serviceTitanReloadKey, timeZone: config.timeZone, technicianId: v.technicianId };
}
function datasourceBase(config, technicianId, now, dateRange) {
  const v = values(config, technicianId, now, dateRange);
  return { TechnicianId: String(v.technicianId), BusinessUnitId: v.csv, JobTypes: "", DashboardReloadKey: config.serviceTitanReloadKey, From: v.from, To: v.to };
}
function buildTechnicianDatasourceRequest(config, technicianId, now = new Date(), dateRange) {
  return { ...datasourceBase(config, technicianId, now, dateRange), Fields: TECHNICIAN_DATASOURCE_FIELD_STRING, VisibleFields: TECHNICIAN_DATASOURCE_FIELD_STRING, TimeZone: config.timeZone };
}
function buildTechnicianJobDrilldownRequest(config, technicianId, now = new Date(), dateRange) {
  return { ...datasourceBase(config, technicianId, now, dateRange), KpiType: config.serviceTitanDrilldownKpiType, TimeZone: config.timeZone };
}
module.exports = { buildTechnicianOverviewRequest, buildTechnicianDatasourceRequest, buildTechnicianJobDrilldownRequest };
