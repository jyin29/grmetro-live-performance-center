"use strict";
const { CsrfTokenProvider } = require("./csrfTokenProvider");
const { ServiceTitanRequestExecutor } = require("./requestExecutor");
const { ENDPOINTS } = require("./endpoints");
const { buildTechnicianJobDrilldownRequest } = require("./requestBuilders");
const { validateJsonResponse } = require("./responseValidation");
const { sanitizeDrilldownRecords } = require("./drilldownSanitizer");
const { ServiceTitanResearchObserver } = require("./researchObserver");
function createServiceTitanClient({ config, browserManager, logger }) {
  const csrfTokenProvider = new CsrfTokenProvider({ browserManager, baseUrl: config.serviceTitanBaseUrl, timeoutMilliseconds: config.serviceTitanCsrfTimeoutMilliseconds, logger });
  const executor = new ServiceTitanRequestExecutor({ browserManager, csrfTokenProvider, baseUrl: config.serviceTitanBaseUrl, timeoutMilliseconds: config.serviceTitanRequestTimeoutMilliseconds });
  const researchObserver = new ServiceTitanResearchObserver({ browserManager, logger });
  return { csrfTokenProvider, executor, researchObserver, async fetchTechnicianJobDrilldown({ technicianId, date }) {
    const response = await executor.post(ENDPOINTS.technicianJobDrilldown, buildTechnicianJobDrilldownRequest(config, technicianId, new Date(`${date}T12:00:00Z`)));
    const rows = validateJsonResponse(response, { endpointName: ENDPOINTS.technicianJobDrilldown.name, expectedShape: "array" });
    return { technicianId: Number(technicianId), date, ...sanitizeDrilldownRecords(rows) };
  }, stop: () => { researchObserver.shutdown(); csrfTokenProvider.stop(); }, getStatus: () => ({ status: csrfTokenProvider.getSafeStatus().available ? "connected" : "unavailable" }) };
}
module.exports = { createServiceTitanClient };
