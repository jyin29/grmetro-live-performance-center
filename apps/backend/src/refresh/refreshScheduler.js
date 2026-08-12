"use strict";

const { assertRefreshProvider, safeRefreshDiagnostic } = require("../providers/refreshProvider");

function dateInTimeZone(value, timeZone) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit"
  }).formatToParts(value);
  const get = (type) => parts.find((part) => part.type === type).value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

class RefreshScheduler {
  constructor({ provider, cache, logger, intervalMilliseconds, timeZone,
    clock = () => new Date(), setIntervalFn = setInterval, clearIntervalFn = clearInterval, onSuccessfulPayload } = {}) {
    this.provider = assertRefreshProvider(provider);
    if (!cache || !logger) throw new Error("RefreshScheduler requires a cache and logger.");
    if (!Number.isFinite(intervalMilliseconds) || intervalMilliseconds <= 0) throw new TypeError("A positive refresh interval is required.");
    this.cache = cache;
    this.logger = logger;
    this.intervalMilliseconds = intervalMilliseconds;
    this.timeZone = timeZone;
    this.clock = clock;
    this.setIntervalFn = setIntervalFn;
    this.clearIntervalFn = clearIntervalFn;
    this.onSuccessfulPayload = onSuccessfulPayload;
    this.timer = null;
    this.active = false;
  }

  start() {
    if (this.timer) return;
    void this.refresh("startup");
    this.timer = this.setIntervalFn(() => void this.refresh("scheduled"), this.intervalMilliseconds);
    this.timer.unref?.();
  }

  async refresh(trigger = "manual") {
    if (this.active) {
      this.logger.warn("Dashboard refresh skipped because another refresh is active", { trigger, code: "REFRESH_IN_PROGRESS" });
      return { ok: false, skipped: true, code: "REFRESH_IN_PROGRESS" };
    }
    this.active = true;
    const started = this.clock();
    this.cache.markRefreshStarted(started);
    const refreshDate = dateInTimeZone(started, this.timeZone);
    try {
      const payload = await this.provider.refresh({
        now: started.toISOString(),
        date: refreshDate,
        previousPayload: this.cache.getPayload()
      });
      const completed = this.clock();
      this.cache.storeSuccessfulPayload(payload, completed);
      this.onSuccessfulPayload?.(this.cache.getPayload());
      const results = payload.diagnostics?.results || [];
      this.logger.info("Dashboard refresh completed", {
        trigger, date: refreshDate, successfulTechnicians: results.filter((item) => item.ok).length,
        staleTechnicians: results.filter((item) => item.stale).length
      });
      return { ok: true, skipped: false, date: refreshDate, results };
    } catch (error) {
      const diagnostic = safeRefreshDiagnostic(error);
      this.cache.markRefreshFailed(diagnostic, this.clock());
      this.logger.error("Dashboard refresh failed; previous cache retained", { trigger, date: refreshDate, diagnostic });
      return { ok: false, skipped: false, date: refreshDate, diagnostic };
    } finally {
      this.active = false;
    }
  }

  stop() {
    if (!this.timer) return;
    this.clearIntervalFn(this.timer);
    this.timer = null;
  }
}

module.exports = { RefreshScheduler, dateInTimeZone };
