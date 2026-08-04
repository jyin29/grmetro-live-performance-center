"use strict";
const { ERROR_CODES, ServiceTitanError } = require("./errors");
class CsrfTokenProvider {
  constructor({ browserManager, timeoutMilliseconds = 10000, setTimeoutFn = setTimeout, clearTimeoutFn = clearTimeout } = {}) {
    if (!browserManager) throw new TypeError("CSRF token provider requires a browser manager.");
    this.browserManager = browserManager; this.timeoutMilliseconds = timeoutMilliseconds; this.setTimeoutFn = setTimeoutFn; this.clearTimeoutFn = clearTimeoutFn;
    this.page = null; this.token = null; this.waiters = new Set(); this.stopped = false;
    this.responseHandler = (response) => this.observeResponse(response);
    this.unsubscribe = browserManager.subscribe?.(() => { this.clear(); this.attachToCurrentPage(); }) || null;
  }
  attachToCurrentPage() { if (this.stopped) return; let page; try { page = this.browserManager.getServiceTitanPage(); } catch { page = null; } this.attach(page); }
  attach(page) { if (page === this.page) return; this.detach(); this.clear(); this.page = page || null; this.page?.on?.("response", this.responseHandler); }
  detach() { this.page?.off?.("response", this.responseHandler); this.page = null; }
  async observeResponse(response) {
    try { if (response.status?.() < 200 || response.status?.() >= 400) return; const headers = await response.request?.().allHeaders?.() || response.request?.().headers?.() || {}; const entry = Object.entries(headers).find(([name]) => name.toLowerCase() === "x-csrf-token"); if (entry?.[1]) this.set(entry[1]); } catch { /* observation is best effort and never logs secrets */ }
  }
  set(token) { if (typeof token !== "string" || !token) return; this.token = token; for (const waiter of this.waiters) waiter.resolve(token); this.waiters.clear(); }
  clear() { this.token = null; }
  getSafeStatus() { return Object.freeze({ available: Boolean(this.token), observing: Boolean(this.page) }); }
  waitForToken(timeoutMilliseconds = this.timeoutMilliseconds) {
    if (this.token) return Promise.resolve(this.token);
    this.attachToCurrentPage();
    if (this.token) return Promise.resolve(this.token);
    return new Promise((resolve, reject) => { const waiter = { resolve: (token) => { this.clearTimeoutFn(waiter.timer); resolve(token); } }; waiter.timer = this.setTimeoutFn(() => { this.waiters.delete(waiter); reject(new ServiceTitanError(ERROR_CODES.CSRF, "No ServiceTitan CSRF token is available. Refresh an authenticated ServiceTitan page and try again.")); }, timeoutMilliseconds); this.waiters.add(waiter); });
  }
  handleStatus(status) { if (status === 401 || status === 403) this.clear(); }
  stop() { if (this.stopped) return; this.stopped = true; this.detach(); this.clear(); this.unsubscribe?.(); for (const waiter of this.waiters) { this.clearTimeoutFn(waiter.timer); waiter.resolve = () => {}; } this.waiters.clear(); }
}
module.exports = { CsrfTokenProvider };
