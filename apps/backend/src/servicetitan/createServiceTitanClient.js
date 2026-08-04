"use strict";
const { CsrfTokenProvider } = require("./csrfTokenProvider");
const { ServiceTitanRequestExecutor } = require("./requestExecutor");
const { ENDPOINTS } = require("./endpoints");
const { buildTechnicianJobDrilldownRequest } = require("./requestBuilders");
const { validateJsonResponse } = require("./responseValidation");
const { sanitizeDrilldownRecords, sanitizeDatasourceMetadata } = require("./drilldownSanitizer");
function createServiceTitanClient({ config, browserManager }) {
  const csrfTokenProvider = new CsrfTokenProvider({ browserManager, timeoutMilliseconds: config.serviceTitanCsrfTimeoutMilliseconds });
  const executor = new ServiceTitanRequestExecutor({ browserManager, csrfTokenProvider, baseUrl: config.serviceTitanBaseUrl, timeoutMilliseconds: config.serviceTitanRequestTimeoutMilliseconds });
  return { csrfTokenProvider, executor, async fetchTechnicianJobDrilldown({ technicianId, date, kpiType, includeMetadata = false }) {
    const requestedKpiType = String(kpiType ?? config.serviceTitanDrilldownKpiType);
    const response = await executor.post(ENDPOINTS.technicianJobDrilldown, buildTechnicianJobDrilldownRequest(config, technicianId, new Date(`${date}T12:00:00Z`), { kpiType: requestedKpiType }));
    const rows = validateJsonResponse(response, { endpointName: ENDPOINTS.technicianJobDrilldown.name, expectedShape: "array" });
    const result = { technicianId: Number(technicianId), date, requestedKpiType, ...sanitizeDrilldownRecords(rows) };
    if (includeMetadata) result.datasourceMetadata = await this.fetchJobDrilldownMetadata();
    return result;
  }, async fetchJobDrilldownMetadata() {
    const response = await executor.get(ENDPOINTS.jobDrilldownMetadata);
    const metadata = validateJsonResponse(response, { endpointName: ENDPOINTS.jobDrilldownMetadata.name });
    return { datasource: "TechnicianJobsExtendedDrilldownDatasource", fields: sanitizeDatasourceMetadata(metadata) };
  }, stop: () => csrfTokenProvider.stop(), getStatus: () => ({ status: csrfTokenProvider.getSafeStatus().available ? "connected" : "unavailable" }) };
}
module.exports = { createServiceTitanClient };
