"use strict";

const { assertRefreshProvider, safeRefreshDiagnostic } = require("../providers/refreshProvider");

const DASHBOARD_PERIODS = Object.freeze({ TODAY: "today", MTD: "mtd" });

function dateInTimeZone(value, timeZone) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit"
  }).formatToParts(value);
  const get = (type) => parts.find((part) => part.type === type).value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function periodRange(value, timeZone, period = DASHBOARD_PERIODS.TODAY) {
  const to = dateInTimeZone(value, timeZone);
  if (period === DASHBOARD_PERIODS.TODAY) return { from: to, to, period };
  if (period === DASHBOARD_PERIODS.MTD) return { from: `${to.slice(0, 8)}01`, to, period };
  throw new TypeError(`Unsupported dashboard period: ${period}`);
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
    this.period = DASHBOARD_PERIODS.TODAY;
  }

  getPeriod() { return this.period; }

  async setPeriod(period) {
    if (!Object.values(DASHBOARD_PERIODS).includes(period)) throw new TypeError("Dashboard period must be today or mtd.");
    if (period === this.period) return { ok: true, unchanged: true, period };
    const previous = this.period;
    this.period = period;
    const result = await this.refresh("period-change");
    if (!result.ok) this.period = previous;
    return { ...result, period: this.period };
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
    const range = periodRange(started, this.timeZone, this.period);
    try {
      const payload = await this.provider.refresh({
        now: started.toISOString(),
        date: range.to,
        period: range.period,
        dateRange: range,
        previousPayload: this.cache.getPayload()
      });
      const completed = this.clock();
      const periodPayload = { ...payload, period: range.period, dateRange: { from: range.from, to: range.to } };
      this.cache.storeSuccessfulPayload(periodPayload, completed);
      this.onSuccessfulPayload?.(this.cache.getPayload());
      const results = payload.diagnostics?.results || [];
      this.logger.info("Dashboard refresh completed", {
        trigger, date: range.to, period: range.period, from: range.from, to: range.to,
        successfulTechnicians: results.filter((item) => item.ok).length,
        staleTechnicians: results.filter((item) => item.stale).length
      });
      return { ok: true, skipped: false, date: range.to, period: range.period, dateRange: range, results };
    } catch (error) {
      const diagnostic = safeRefreshDiagnostic(error);
      this.cache.markRefreshFailed(diagnostic, this.clock());
      this.logger.error("Dashboard refresh failed; previous cache retained", { trigger, date: range.to, period: range.period, diagnostic });
      return { ok: false, skipped: false, date: range.to, period: range.period, dateRange: range, diagnostic };
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

module.exports = { RefreshScheduler, dateInTimeZone, periodRange, DASHBOARD_PERIODS };
