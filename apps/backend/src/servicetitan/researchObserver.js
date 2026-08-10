"use strict";

const MAX_EVENTS = 100;
const BINDING_NAME = "__grmetroResearchObservation";
const STATE_NAME = "__grmetroResearchInterceptor";

function sanitizedUrl(value) {
  try {
    const url = new URL(String(value));
    return `${url.origin}${url.pathname}`;
  } catch { return null; }
}

function isObservedEndpoint(url) {
  const path = (() => { try { return new URL(String(url)).pathname; } catch { return String(url || "").split("?")[0]; } })();
  return path.startsWith("/app/api/reporting/") || /GetDatasource(?:Data|ForTechScorecards)$/.test(path);
}

/* This function is serialized by Playwright and must not close over module state. */
function installInterceptor({ bindingName, stateName }) {
  const existing = globalThis[stateName];
  if (existing?.installed) return existing.status();

  const originalFetch = typeof globalThis.fetch === "function" ? globalThis.fetch : null;
  const xhrPrototype = globalThis.XMLHttpRequest?.prototype || null;
  const originalOpen = xhrPrototype?.open || null;
  const originalSend = xhrPrototype?.send || null;
  const state = {
    installed: true,
    originalFetch,
    xhrPrototype,
    originalOpen,
    originalSend,
    status() {
      return {
        interceptionActive: state.installed,
        fetchPatched: Boolean(originalFetch && globalThis.fetch !== originalFetch),
        xhrPatched: Boolean(xhrPrototype && originalOpen && originalSend && xhrPrototype.open !== originalOpen && xhrPrototype.send !== originalSend)
      };
    },
    restore() {
      if (!state.installed) return;
      if (originalFetch) globalThis.fetch = originalFetch;
      if (xhrPrototype) { xhrPrototype.open = originalOpen; xhrPrototype.send = originalSend; }
      state.installed = false;
    }
  };

  if (originalFetch) {
    globalThis.fetch = async function grmetroObservedFetch(input, init) {
      const method = String(init?.method || input?.method || "GET").toUpperCase();
      const url = String(input?.url || input);
      try {
        const response = await originalFetch.apply(this, arguments);
        void globalThis[bindingName]?.({ transport: "fetch", method, url, status: response.status, contentType: response.headers?.get?.("content-type") || null });
        return response;
      } catch (error) {
        void globalThis[bindingName]?.({ transport: "fetch", method, url, status: null, contentType: null });
        throw error;
      }
    };
  }
  if (xhrPrototype && originalOpen && originalSend) {
    xhrPrototype.open = function grmetroObservedOpen(method, url) {
      this.__grmetroResearchRequest = { method: String(method || "GET").toUpperCase(), url: String(url) };
      return originalOpen.apply(this, arguments);
    };
    xhrPrototype.send = function grmetroObservedSend() {
      this.addEventListener("loadend", () => {
        const request = this.__grmetroResearchRequest;
        if (request) void globalThis[bindingName]?.({ transport: "xhr", ...request, status: this.status || null, contentType: this.getResponseHeader?.("content-type") || null });
      }, { once: true });
      return originalSend.apply(this, arguments);
    };
  }
  globalThis[stateName] = state;
  return state.status();
}

function interceptorStatus(stateName) {
  const state = globalThis[stateName];
  return state?.status?.() || { interceptionActive: false, fetchPatched: false, xhrPatched: false };
}

function restoreInterceptor(stateName) { globalThis[stateName]?.restore?.(); }

class ServiceTitanResearchObserver {
  constructor({ browserManager, clock = () => new Date(), maxEvents = MAX_EVENTS, logger } = {}) {
    if (!browserManager) throw new TypeError("ServiceTitanResearchObserver requires a browser manager.");
    this.browserManager = browserManager;
    this.clock = clock;
    this.maxEvents = maxEvents;
    this.logger = logger || { warn() {}, debug() {} };
    this.events = [];
    this.active = false;
    this.page = null;
    this.unsubscribeBrowser = null;
    this.observedRequestCount = 0;
    this.ignoredRequestCount = 0;
    this.frameDiagnostics = [];
    this.exposedPages = new WeakSet();
    this.onFrame = () => { if (this.active) void this.refreshFrames(); };
  }

  async start() {
    if (this.active) return this.status();
    const page = this.browserManager.getServiceTitanPage();
    this.active = true;
    this.unsubscribeBrowser = this.browserManager.subscribe?.((event) => {
      if (event.type === "page-changed") void this.attachPage(event.page);
      if (["disconnected", "stopped"].includes(event.type)) void this.detachPage();
    }) || null;
    try {
      await this.attachPage(page);
      const status = this.status();
      if (!status.interceptionActive || !status.fetchPatched || !status.xhrPatched) throw new Error("Fetch/XHR interception verification failed.");
      return status;
    } catch (error) {
      await this.stop();
      error.code = "RESEARCH_INTERCEPTION_FAILED";
      throw error;
    }
  }

  async stop() {
    this.active = false;
    await this.detachPage();
    this.unsubscribeBrowser?.();
    this.unsubscribeBrowser = null;
    return this.status();
  }
  clear() { this.events = []; this.observedRequestCount = 0; this.ignoredRequestCount = 0; }
  async shutdown() { await this.stop(); this.clear(); }

  async attachPage(page) {
    if (!this.active || !page) return;
    if (page !== this.page) {
      await this.detachPage();
      this.page = page;
      if (!this.exposedPages.has(page)) {
        await page.exposeBinding(BINDING_NAME, (_source, observation) => this.record(observation));
        this.exposedPages.add(page);
      }
      page.on?.("frameattached", this.onFrame);
      page.on?.("framenavigated", this.onFrame);
    }
    await this.refreshFrames();
  }

  async refreshFrames() {
    const page = this.page;
    if (!this.active || !page) return;
    const diagnostics = await Promise.all((page.frames?.() || [page.mainFrame?.()].filter(Boolean)).map((frame) => this.patchFrame(frame)));
    if (this.active && page === this.page) this.frameDiagnostics = diagnostics;
  }

  async patchFrame(frame) {
    try { return await frame.evaluate(installInterceptor, { bindingName: BINDING_NAME, stateName: STATE_NAME }); }
    catch { return { interceptionActive: false, fetchPatched: false, xhrPatched: false }; }
  }

  async detachPage() {
    const page = this.page;
    if (!page) return;
    page.off?.("frameattached", this.onFrame);
    page.off?.("framenavigated", this.onFrame);
    await Promise.allSettled((page.frames?.() || []).map((frame) => frame.evaluate(restoreInterceptor, STATE_NAME)));
    this.page = null;
    this.frameDiagnostics = [];
  }

  record(observation) {
    if (!this.active || !observation || !isObservedEndpoint(observation.url)) { this.ignoredRequestCount += 1; return; }
    const url = sanitizedUrl(observation.url);
    if (!url) { this.ignoredRequestCount += 1; return; }
    this.observedRequestCount += 1;
    this.events.push({ timestamp: this.clock().toISOString(), method: observation.method || null, url, status: observation.status ?? null, contentType: observation.contentType ? String(observation.contentType).split(";")[0] : null });
    while (this.events.length > this.maxEvents) this.events.shift();
  }

  status() {
    const frames = this.frameDiagnostics;
    return {
      active: this.active,
      attached: Boolean(this.page),
      interceptionActive: frames.length > 0 && frames.every((item) => item.interceptionActive),
      fetchPatched: frames.length > 0 && frames.every((item) => item.fetchPatched),
      xhrPatched: frames.length > 0 && frames.every((item) => item.xhrPatched),
      pageUrl: this.page?.url?.() || null,
      frameCount: this.page?.frames?.().length || 0,
      observedRequestCount: this.observedRequestCount,
      ignoredRequestCount: this.ignoredRequestCount,
      eventCount: this.events.length
    };
  }
  results() { return { ...this.status(), maxEvents: this.maxEvents, count: this.events.length, events: structuredClone(this.events) }; }
}

module.exports = { ServiceTitanResearchObserver, installInterceptor, interceptorStatus, restoreInterceptor, isObservedEndpoint, sanitizedUrl };
