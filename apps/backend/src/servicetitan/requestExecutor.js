"use strict";
const { ERROR_CODES, ServiceTitanError } = require("./errors");
class ServiceTitanRequestExecutor {
  constructor({ browserManager, csrfTokenProvider, baseUrl, timeoutMilliseconds = 20000, clock = () => Date.now() } = {}) {
    if (!browserManager || !csrfTokenProvider || !baseUrl) throw new TypeError("ServiceTitan request executor configuration is incomplete.");
    this.browserManager = browserManager; this.csrfTokenProvider = csrfTokenProvider; this.baseUrl = baseUrl; this.timeoutMilliseconds = timeoutMilliseconds; this.clock = clock;
  }
  async post(endpoint, body) {
    let page; try { page = this.browserManager.getServiceTitanPage(); } catch { throw new ServiceTitanError(ERROR_CODES.UNAVAILABLE, "The authenticated ServiceTitan browser page is unavailable.", { endpointName: endpoint.name }); }
    this.csrfTokenProvider.attach(page);
    const started = this.clock();
    try {
      const result = await page.evaluate(async ({ url, payload, timeoutMilliseconds }) => {
        const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), timeoutMilliseconds);
        try {
          // Execute from the already-authenticated ServiceTitan dashboard page. Do not
          // block every refresh waiting for our separate CSRF discovery machinery.
          // First mirror a normal same-origin AJAX request. If the current page exposes
          // a CSRF token in its own state, include it; otherwise let ServiceTitan's
          // authenticated same-origin session handle the request normally.
          const readPath = (root, path) => path.reduce((value, key) => value && typeof value === "object" ? value[key] : undefined, root);
          const paths = [["ServiceTitan","csrfToken"],["ServiceTitan","antiForgeryToken"],["ServiceTitan","security","csrfToken"],["__SERVICE_TITAN__","csrfToken"],["__ST_APP_STATE__","csrfToken"]];
          let csrfToken = null;
          for (const path of paths) { const value = readPath(window, path); if (typeof value === "string" && value) { csrfToken = value; break; } }
          if (!csrfToken) csrfToken = document.querySelector('meta[name="csrf-token"],meta[name="x-csrf-token"],meta[name="__RequestVerificationToken"]')?.getAttribute("content") || null;
          const headers = { Accept: "application/json", "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" };
          if (csrfToken) headers["X-CSRF-Token"] = csrfToken;
          const response = await fetch(url, { method: "POST", credentials: "include", signal: controller.signal, headers, body: JSON.stringify(payload) });
          return { status: response.status, finalUrl: response.url, contentType: response.headers.get("content-type") || "", body: await response.text(), usedPageCsrf: Boolean(csrfToken) };
        } finally { clearTimeout(timer); }
      }, { url: new URL(endpoint.path, this.baseUrl).href, payload: body, timeoutMilliseconds: this.timeoutMilliseconds });
      this.csrfTokenProvider.handleStatus(result.status);
      return { status: result.status, finalUrl: result.finalUrl, contentType: result.contentType, body: result.body, duration: Math.max(0, this.clock() - started), usedPageCsrf: result.usedPageCsrf };
    } catch (error) {
      if (error?.name === "AbortError" || /timeout|timed out|aborted/i.test(error?.message || "")) throw new ServiceTitanError(ERROR_CODES.TIMEOUT, "The ServiceTitan request timed out.", { endpointName: endpoint.name });
      if (error instanceof ServiceTitanError) throw error;
      throw new ServiceTitanError(ERROR_CODES.UNAVAILABLE, "The ServiceTitan request could not be completed.", { endpointName: endpoint.name });
    }
  }
}
module.exports = { ServiceTitanRequestExecutor };
