"use strict";

const { BrowserManagerError } = require("./browserErrors");
const { findServiceTitanPage } = require("./findServiceTitanPage");

const DEFAULT_RETRY_DELAYS = Object.freeze([1000, 2000, 5000, 10000, 30000]);

function safeConnectionError(error) {
  if (error?.code === "SERVICE_TITAN_PAGE_NOT_FOUND" || error?.code === "SERVICE_TITAN_AUTH_REQUIRED") return error;
  if (error?.code === "BROWSER_CONNECTION_TIMEOUT" || error?.name === "TimeoutError") {
    return new BrowserManagerError("BROWSER_CONNECTION_TIMEOUT");
  }
  return new BrowserManagerError("BROWSER_CONNECTION_FAILED");
}

class BrowserManager {
  constructor({ debugUrl, connectionTimeoutMilliseconds = 30000, connector, logger,
    retryDelays = DEFAULT_RETRY_DELAYS, clock = () => new Date(),
    setTimeoutFn = setTimeout, clearTimeoutFn = clearTimeout } = {}) {
    if (!debugUrl) throw new TypeError("BrowserManager requires a debug URL.");
    if (typeof connector !== "function") throw new TypeError("BrowserManager requires a CDP connector.");
    this.debugUrl = debugUrl;
    this.connectionTimeoutMilliseconds = connectionTimeoutMilliseconds;
    this.connector = connector;
    this.logger = logger || { debug() {}, info() {}, warn() {}, error() {} };
    this.retryDelays = [...retryDelays];
    this.clock = clock;
    this.setTimeoutFn = setTimeoutFn;
    this.clearTimeoutFn = clearTimeoutFn;
    this.browser = null;
    this.page = null;
    this.connectPromise = null;
    this.reconnectTimer = null;
    this.reconnectAttempt = 0;
    this.stopped = false;
    this.lastConnectedAt = null;
    this.lastDisconnectedAt = null;
    this.lastError = null;
    this.disconnectHandler = () => this.handleDisconnect();
  }

  getStatus() {
    return Object.freeze({
      connected: this.browser?.isConnected?.() === true,
      connecting: this.connectPromise !== null,
      serviceTitanPageFound: Boolean(this.page && !this.page.isClosed?.()),
      lastConnectedAt: this.lastConnectedAt,
      lastDisconnectedAt: this.lastDisconnectedAt,
      reconnectAttempt: this.reconnectAttempt,
      lastErrorCode: this.lastError?.code || null,
      lastErrorMessage: this.lastError?.message || null
    });
  }

  getBrowser() {
    if (!this.browser || this.browser.isConnected?.() !== true) throw new BrowserManagerError("BROWSER_NOT_CONNECTED");
    return this.browser;
  }

  getServiceTitanPage() {
    const browser = this.getBrowser();
    if (!this.page || this.page.isClosed?.()) this.page = findServiceTitanPage(browser);
    return this.page;
  }

  connect() {
    if (this.stopped) return Promise.reject(new BrowserManagerError("BROWSER_MANAGER_STOPPED"));
    if (this.browser?.isConnected?.() === true) {
      try { this.page = this.page && !this.page.isClosed?.() ? this.page : findServiceTitanPage(this.browser); }
      catch (error) { this.recordError(error); throw error; }
      return Promise.resolve(this.browser);
    }
    if (this.connectPromise) return this.connectPromise;
    this.connectPromise = this.performConnect().finally(() => { this.connectPromise = null; });
    return this.connectPromise;
  }

  async performConnect() {
    let browser;
    try {
      browser = await this.connector(this.debugUrl, { timeout: this.connectionTimeoutMilliseconds });
      if (this.stopped) throw new BrowserManagerError("BROWSER_MANAGER_STOPPED");
      this.detachBrowserListener();
      this.browser = browser;
      this.page = null;
      browser.on?.("disconnected", this.disconnectHandler);
      const page = findServiceTitanPage(browser);
      this.page = page;
      this.lastConnectedAt = this.clock().toISOString();
      this.lastError = null;
      this.reconnectAttempt = 0;
      this.clearReconnectTimer();
      this.logger.info("Connected to the dedicated Microsoft Edge session");
      return browser;
    } catch (original) {
      const error = original?.code === "BROWSER_MANAGER_STOPPED" ? original : safeConnectionError(original);
      this.recordError(error);
      throw error;
    }
  }

  start() {
    if (this.stopped) return;
    void this.connect().catch(() => this.scheduleReconnect());
  }

  handleDisconnect() {
    if (this.stopped) return;
    this.detachBrowserListener();
    this.browser = null;
    this.page = null;
    this.lastDisconnectedAt = this.clock().toISOString();
    this.lastError = new BrowserManagerError("BROWSER_NOT_CONNECTED");
    this.logger.warn("Microsoft Edge disconnected; cached dashboard data will be preserved", { code: "BROWSER_NOT_CONNECTED" });
    this.scheduleReconnect();
  }

  scheduleReconnect() {
    if (this.stopped || this.reconnectTimer || this.connectPromise) return;
    const index = Math.min(this.reconnectAttempt, this.retryDelays.length - 1);
    const delay = this.retryDelays[index];
    this.reconnectAttempt += 1;
    this.reconnectTimer = this.setTimeoutFn(() => {
      this.reconnectTimer = null;
      void this.connect().catch(() => this.scheduleReconnect());
    }, delay);
    this.reconnectTimer?.unref?.();
  }

  recordError(error) {
    this.lastError = error instanceof BrowserManagerError ? error : safeConnectionError(error);
    this.logger.warn(this.lastError.message, { code: this.lastError.code });
  }

  clearReconnectTimer() {
    if (this.reconnectTimer !== null) this.clearTimeoutFn(this.reconnectTimer);
    this.reconnectTimer = null;
  }

  detachBrowserListener() {
    this.browser?.off?.("disconnected", this.disconnectHandler);
  }

  stop() {
    if (this.stopped) return;
    this.stopped = true;
    this.clearReconnectTimer();
    this.detachBrowserListener();
    this.browser = null;
    this.page = null;
  }
}

function createPlaywrightConnector() {
  return (debugUrl, options) => require("playwright").chromium.connectOverCDP(debugUrl, options);
}

module.exports = { DEFAULT_RETRY_DELAYS, BrowserManager, createPlaywrightConnector, safeConnectionError };
