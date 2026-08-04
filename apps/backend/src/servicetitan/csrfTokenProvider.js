"use strict";

const { ENDPOINTS } = require("./endpoints");
const { ERROR_CODES, ServiceTitanError } = require("./errors");

const SAFE_GLOBAL_PATHS = Object.freeze([
  ["ServiceTitan", "csrfToken"],
  ["ServiceTitan", "antiForgeryToken"],
  ["ServiceTitan", "security", "csrfToken"],
  ["__SERVICE_TITAN__", "csrfToken"],
  ["__ST_APP_STATE__", "csrfToken"]
]);

function csrfError() {
  return new ServiceTitanError(ERROR_CODES.CSRF, "No usable ServiceTitan CSRF token is currently available. The backend will retry automatically.");
}

class CsrfTokenProvider {
  constructor({ browserManager, baseUrl = "https://go.servicetitan.com", timeoutMilliseconds = 10000,
    acquisitionEndpoint = ENDPOINTS.technicianMetadata, logger, setTimeoutFn = setTimeout, clearTimeoutFn = clearTimeout } = {}) {
    if (!browserManager) throw new TypeError("CSRF token provider requires a browser manager.");
    this.browserManager = browserManager;
    this.baseUrl = baseUrl;
    this.timeoutMilliseconds = timeoutMilliseconds;
    this.acquisitionEndpoint = acquisitionEndpoint;
    this.logger = logger || { debug() {}, info() {}, warn() {} };
    this.setTimeoutFn = setTimeoutFn;
    this.clearTimeoutFn = clearTimeoutFn;
    this.page = null;
    this.token = null;
    this.acquisitionPromise = null;
    this.acquisitionTimer = null;
    this.acquisitionReject = null;
    this.stopped = false;
    this.responseHandler = (response) => this.observeResponse(response);
    this.unsubscribe = browserManager.subscribe?.((event) => {
      this.clear(event?.type === "disconnected" ? "browser disconnect" : "page replacement");
      this.attachToCurrentPage();
    }) || null;
  }

  attachToCurrentPage() {
    if (this.stopped) return;
    let page;
    try { page = this.browserManager.getServiceTitanPage(); } catch { page = null; }
    this.attach(page);
  }

  attach(page) {
    if (page === this.page) return;
    this.detach();
    this.clear("page replacement");
    this.page = page || null;
    if (this.page) {
      this.page.on?.("response", this.responseHandler);
      this.logger.info("CSRF observer attached");
    }
  }

  detach() { this.page?.off?.("response", this.responseHandler); this.page = null; }

  async observeResponse(response) {
    try {
      const status = response.status?.();
      if (status < 200 || status >= 400) return;
      const headers = await response.request?.().allHeaders?.() || response.request?.().headers?.() || {};
      const entry = Object.entries(headers).find(([name]) => name.toLowerCase() === "x-csrf-token");
      if (entry?.[1]) this.set(entry[1]);
    } catch { /* observation is best effort and never logs secrets */ }
  }

  set(token) {
    if (typeof token !== "string" || !token) return;
    this.token = token;
    this.logger.info("CSRF token acquired");
  }

  clear(reason = "explicit CSRF rejection") {
    if (this.token) this.logger.warn("CSRF token cleared", { reason });
    this.token = null;
  }

  getSafeStatus() { return Object.freeze({ available: Boolean(this.token), observing: Boolean(this.page), acquiring: Boolean(this.acquisitionPromise) }); }

  async passiveLookup(page) {
    this.logger.info("Passive CSRF token lookup attempted");
    const token = await page.evaluate((globalPaths) => {
      const fromMeta = ["csrf-token", "csrfToken", "x-csrf-token", "X-CSRF-Token", "__RequestVerificationToken"]
        .map((name) => document.querySelector(`meta[name="${name}"], meta[name="${name.toLowerCase()}"]`)?.getAttribute("content"))
        .find((value) => typeof value === "string" && value.length > 0);
      if (fromMeta) return fromMeta;
      const readPath = (root, path) => path.reduce((value, key) => value && typeof value === "object" ? value[key] : undefined, root);
      for (const path of globalPaths) {
        const value = readPath(window, path);
        if (typeof value === "string" && value.length > 0) return value;
      }
      return null;
    }, SAFE_GLOBAL_PATHS);
    if (token) this.set(token);
    return token;
  }

  async safeAcquisitionRequest(page) {
    this.logger.info("Safe CSRF acquisition request attempted", { endpointName: this.acquisitionEndpoint.name, method: this.acquisitionEndpoint.method });
    if (this.acquisitionEndpoint.method !== "GET") throw csrfError();
    const url = new URL(this.acquisitionEndpoint.path, this.baseUrl).href;
    const result = await page.evaluate(async ({ url, timeoutMilliseconds }) => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMilliseconds);
      try {
        const response = await fetch(url, { method: "GET", credentials: "include", signal: controller.signal, headers: { Accept: "application/json", "X-Requested-With": "XMLHttpRequest" } });
        return { status: response.status, csrfToken: response.headers.get("x-csrf-token") || response.headers.get("X-CSRF-Token") || null };
      } finally { clearTimeout(timer); }
    }, { url, timeoutMilliseconds: this.timeoutMilliseconds });
    this.handleStatus(result.status);
    if (result.csrfToken) this.set(result.csrfToken);
    return this.token;
  }

  acquireToken(timeoutMilliseconds = this.timeoutMilliseconds) {
    if (this.token) return Promise.resolve(this.token);
    if (this.acquisitionPromise) return this.acquisitionPromise;
    this.attachToCurrentPage();
    if (!this.page) return Promise.reject(csrfError());
    const page = this.page;
    this.acquisitionPromise = new Promise((resolve, reject) => {
      this.acquisitionReject = reject;
      this.acquisitionTimer = this.setTimeoutFn(() => reject(csrfError()), timeoutMilliseconds);
      Promise.resolve()
        .then(() => this.passiveLookup(page))
        .then((token) => token || this.safeAcquisitionRequest(page))
        .then((token) => token ? resolve(token) : reject(csrfError()), reject);
    }).catch((error) => {
      this.logger.warn("CSRF token acquisition timed out", { code: error?.code || ERROR_CODES.CSRF });
      throw error instanceof ServiceTitanError ? error : csrfError();
    }).finally(() => {
      if (this.acquisitionTimer) this.clearTimeoutFn(this.acquisitionTimer);
      this.acquisitionTimer = null;
      this.acquisitionReject = null;
      this.acquisitionPromise = null;
    });
    return this.acquisitionPromise;
  }

  waitForToken(timeoutMilliseconds = this.timeoutMilliseconds) { return this.acquireToken(timeoutMilliseconds); }

  handleStatus(status) {
    if (status === 401) this.clear("401");
    if (status === 403) this.clear("403");
  }

  stop() {
    if (this.stopped) return;
    this.stopped = true;
    this.detach();
    this.clear("shutdown");
    this.unsubscribe?.();
    if (this.acquisitionTimer) this.clearTimeoutFn(this.acquisitionTimer);
    this.acquisitionTimer = null;
    this.acquisitionReject?.(csrfError());
    this.acquisitionReject = null;
    this.acquisitionPromise = null;
  }
}
module.exports = { CsrfTokenProvider, SAFE_GLOBAL_PATHS };
