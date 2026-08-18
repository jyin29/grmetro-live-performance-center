"use strict";

const ENDPOINTS = Object.freeze({
  allScorecard: Object.freeze({ name: "allScorecard", method: "POST", path: "/app/api/reporting/modulardashboard/GetAllScorecard" }),
  technicianOverview: Object.freeze({ name: "technicianOverview", method: "POST", path: "/app/api/reporting/modulardashboard/GetTechnicianOverview" }),
  technicianDatasource: Object.freeze({ name: "technicianDatasource", method: "POST", path: "/app/api/reporting/CustomReport/GetDatasourceData?datasource=Technicians&forTechScorecards=true" }),
  technicianJobDrilldown: Object.freeze({ name: "technicianJobDrilldown", method: "POST", path: "/app/api/reporting/CustomReport/GetDatasourceData?datasource=TechnicianJobsExtendedDrilldownDatasource&parentDatasource=Technicians&forTechScorecards=true" }),
  technicianMetadata: Object.freeze({ name: "technicianMetadata", method: "GET", path: "/app/api/reporting/CustomReport/GetDatasourceForTechScorecards?name=Technicians" }),
  jobDrilldownMetadata: Object.freeze({ name: "jobDrilldownMetadata", method: "GET", path: "/app/api/reporting/CustomReport/GetDatasourceForTechScorecards?name=TechnicianJobsExtendedDrilldownDatasource" })
});
module.exports = { ENDPOINTS };
