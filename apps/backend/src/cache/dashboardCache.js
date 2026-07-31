"use strict";

const CACHE_UNAVAILABLE = Object.freeze({
  code: "CACHE_UNAVAILABLE",
  message: "Dashboard data is unavailable until the first successful refresh."
});

function iso(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) throw new TypeError("Cache timestamps must be valid dates.");
  return date.toISOString();
}

class DashboardCache {
  constructor({ clock = () => new Date() } = {}) {
    this.clock = clock;
    this.payload = null;
    this.refreshStartedAt = null;
    this.refreshCompletedAt = null;
    this.lastSuccessfulRefreshAt = null;
    this.lastFailure = null;
  }

  markRefreshStarted(at = this.clock()) {
    this.refreshStartedAt = iso(at);
  }

  storeSuccessfulPayload(payload, at = this.clock()) {
    if (!payload || typeof payload !== "object") throw new TypeError("A successful refresh requires a presentation payload.");
    const completedAt = iso(at);
    this.payload = payload;
    this.refreshCompletedAt = completedAt;
    this.lastSuccessfulRefreshAt = completedAt;
    this.lastFailure = null;
  }

  markRefreshFailed(diagnostic, at = this.clock()) {
    this.refreshCompletedAt = iso(at);
    this.lastFailure = diagnostic || Object.freeze({ code: "REFRESH_FAILED" });
  }

  getPayload() {
    return this.payload;
  }

  getState(at = this.clock()) {
    const now = new Date(at);
    if (Number.isNaN(now.getTime())) throw new TypeError("Cache age requires a valid date.");
    const available = this.payload !== null;
    return {
      available,
      status: available ? "available" : "unavailable",
      error: available ? null : CACHE_UNAVAILABLE,
      payload: this.payload,
      refreshStartedAt: this.refreshStartedAt,
      refreshCompletedAt: this.refreshCompletedAt,
      lastSuccessfulRefreshAt: this.lastSuccessfulRefreshAt,
      cacheAgeMilliseconds: available
        ? Math.max(0, now.getTime() - new Date(this.lastSuccessfulRefreshAt).getTime())
        : null,
      lastFailure: this.lastFailure
    };
  }
}

module.exports = { CACHE_UNAVAILABLE, DashboardCache };
