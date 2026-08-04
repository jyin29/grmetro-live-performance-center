"use strict";
const { CsrfTokenProvider } = require("./csrfTokenProvider");
const { ServiceTitanRequestExecutor } = require("./requestExecutor");
const { ENDPOINTS } = require("./endpoints");
const { buildTechnicianJobDrilldownRequest } = require("./requestBuilders");
const { validateJsonResponse } = require("./responseValidation");
const { sanitizeDrilldownRecords } = require("./drilldownSanitizer");
function createServiceTitanClient({ config, browserManager }) {
  const csrfTokenProvider = new CsrfTokenProvider({ browserManager, timeoutMilliseconds: config.serviceTitanCsrfTimeoutMilliseconds });
  const executor = new ServiceTitanRequestExecutor({ browserManager, csrfTokenProvider, baseUrl: config.serviceTitanBaseUrl, timeoutMilliseconds: config.serviceTitanRequestTimeoutMilliseconds });
  return { csrfTokenProvider, executor, async fetchTechnicianJobDrilldown({ technicianId, date }) {
    const response = await executor.post(ENDPOINTS.technicianJobDrilldown, buildTechnicianJobDrilldownRequest(config, technicianId, new Date(`${date}T12:00:00Z`)));
    const rows = validateJsonResponse(response, { endpointName: ENDPOINTS.technicianJobDrilldown.name, expectedShape: "array" });
    return { technicianId: Number(technicianId), date, ...sanitizeDrilldownRecords(rows) };
  }, stop: () => csrfTokenProvider.stop(), getStatus: () => ({ status: csrfTokenProvider.getSafeStatus().available ? "connected" : "unavailable" }) };
}
module.exports = { createServiceTitanClient };
