"use strict";
const { ERROR_CODES, ServiceTitanError } = require("./errors");
class ServiceTitanRequestExecutor {
  constructor({ browserManager, csrfTokenProvider, baseUrl, timeoutMilliseconds = 20000, clock = () => Date.now() } = {}) {
    if (!browserManager || !csrfTokenProvider || !baseUrl) throw new TypeError("ServiceTitan request executor configuration is incomplete.");
    this.browserManager = browserManager; this.csrfTokenProvider = csrfTokenProvider; this.baseUrl = baseUrl; this.timeoutMilliseconds = timeoutMilliseconds; this.clock = clock;
  }
  async request(endpoint, { method = "GET", body } = {}) {
    let page; try { page = this.browserManager.getServiceTitanPage(); } catch { throw new ServiceTitanError(ERROR_CODES.UNAVAILABLE, "The authenticated ServiceTitan browser page is unavailable.", { endpointName: endpoint.name }); }
    this.csrfTokenProvider.attach(page);
    const token = await this.csrfTokenProvider.waitForToken(); const started = this.clock();
    try {
      const result = await page.evaluate(async ({ url, method, payload, csrfToken, timeoutMilliseconds }) => {
        const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), timeoutMilliseconds);
        const headers = { Accept: "application/json", "X-Requested-With": "XMLHttpRequest", "X-CSRF-Token": csrfToken };
        if (method !== "GET") headers["Content-Type"] = "application/json";
        try { const response = await fetch(url, { method, credentials: "include", signal: controller.signal, headers, body: method === "GET" ? undefined : JSON.stringify(payload) }); return { status: response.status, finalUrl: response.url, contentType: response.headers.get("content-type") || "", body: await response.text() }; }
        finally { clearTimeout(timer); }
      }, { url: new URL(endpoint.path, this.baseUrl).href, method, payload: body, csrfToken: token, timeoutMilliseconds: this.timeoutMilliseconds });
      this.csrfTokenProvider.handleStatus(result.status);
      return { status: result.status, finalUrl: result.finalUrl, contentType: result.contentType, body: result.body, duration: Math.max(0, this.clock() - started) };
    } catch (error) {
      if (error?.name === "AbortError" || /timeout|timed out|aborted/i.test(error?.message || "")) throw new ServiceTitanError(ERROR_CODES.TIMEOUT, "The ServiceTitan request timed out.", { endpointName: endpoint.name });
      if (error instanceof ServiceTitanError) throw error;
      throw new ServiceTitanError(ERROR_CODES.UNAVAILABLE, "The ServiceTitan request could not be completed.", { endpointName: endpoint.name });
    }
  }
  post(endpoint, body) { return this.request(endpoint, { method: "POST", body }); }
  get(endpoint) { return this.request(endpoint, { method: "GET" }); }
}
module.exports = { ServiceTitanRequestExecutor };
