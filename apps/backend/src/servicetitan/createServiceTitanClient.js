"use strict";
const { CsrfTokenProvider } = require("./csrfTokenProvider");
const { ServiceTitanRequestExecutor } = require("./requestExecutor");
function createServiceTitanClient({ config, browserManager }) {
  const csrfTokenProvider = new CsrfTokenProvider({ browserManager, timeoutMilliseconds: config.serviceTitanCsrfTimeoutMilliseconds });
  const executor = new ServiceTitanRequestExecutor({ browserManager, csrfTokenProvider, baseUrl: config.serviceTitanBaseUrl, timeoutMilliseconds: config.serviceTitanRequestTimeoutMilliseconds });
  return { csrfTokenProvider, executor, stop: () => csrfTokenProvider.stop(), getStatus: () => ({ status: csrfTokenProvider.getSafeStatus().available ? "connected" : "unavailable" }) };
}
module.exports = { createServiceTitanClient };
