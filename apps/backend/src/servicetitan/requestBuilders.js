"use strict";

const { TECHNICIAN_DATASOURCE_FIELD_STRING } = require("./fields");
const { dateInTimeZone } = require("../refresh/refreshScheduler");

function values(config, technicianId, now) {
  if (!config || !Array.isArray(config.businessUnitIds)) throw new TypeError("ServiceTitan request configuration is required.");
  if (!Number.isSafeInteger(Number(technicianId))) throw new TypeError("A numeric technician ID is required.");
  const date = dateInTimeZone(now instanceof Date ? now : new Date(now), config.timeZone);
  return { date, technicianId: Number(technicianId), units: [...config.businessUnitIds], csv: config.businessUnitIds.join(",") };
}
function buildTechnicianOverviewRequest(config, technicianId, now = new Date()) {
  const v = values(config, technicianId, now);
  return { from: v.date, to: v.date, businessUnitIds: v.units, reloadKey: config.serviceTitanReloadKey, timeZone: config.timeZone, technicianId: v.technicianId };
}
function datasourceBase(config, technicianId, now) {
  const v = values(config, technicianId, now);
  return { TechnicianId: String(v.technicianId), BusinessUnitId: v.csv, JobTypes: "", DashboardReloadKey: config.serviceTitanReloadKey, From: v.date, To: v.date };
}
function buildTechnicianDatasourceRequest(config, technicianId, now = new Date()) {
  return { ...datasourceBase(config, technicianId, now), Fields: TECHNICIAN_DATASOURCE_FIELD_STRING, VisibleFields: TECHNICIAN_DATASOURCE_FIELD_STRING, TimeZone: config.timeZone };
}
function buildTechnicianJobDrilldownRequest(config, technicianId, now = new Date()) {
  return { ...datasourceBase(config, technicianId, now), KpiType: config.serviceTitanDrilldownKpiType, TimeZone: config.timeZone };
}
module.exports = { buildTechnicianOverviewRequest, buildTechnicianDatasourceRequest, buildTechnicianJobDrilldownRequest };
