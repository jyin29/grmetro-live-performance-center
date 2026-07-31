"use strict";

class ExpirationMonitor {
  constructor({ tvManager, intervalMilliseconds = 1000, setIntervalFn = setInterval, clearIntervalFn = clearInterval } = {}) {
    if (!tvManager || typeof tvManager.expireOverrides !== "function") throw new TypeError("tvManager is required.");
    if (!Number.isSafeInteger(intervalMilliseconds) || intervalMilliseconds <= 0) throw new TypeError("intervalMilliseconds must be a positive integer.");
    this.tvManager = tvManager;
    this.intervalMilliseconds = intervalMilliseconds;
    this.setIntervalFn = setIntervalFn;
    this.clearIntervalFn = clearIntervalFn;
    this.timer = null;
  }

  start() {
    if (this.timer) return;
    this.timer = this.setIntervalFn(() => this.tvManager.expireOverrides(), this.intervalMilliseconds);
    this.timer?.unref?.();
  }

  stop() {
    if (this.timer) this.clearIntervalFn(this.timer);
    this.timer = null;
    this.tvManager.stop();
  }
}

module.exports = { ExpirationMonitor };
