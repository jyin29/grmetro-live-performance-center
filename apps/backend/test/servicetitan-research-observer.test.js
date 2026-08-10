"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const EventEmitter = require("node:events");
const vm = require("node:vm");
const { ServiceTitanResearchObserver, isObservedEndpoint } = require("../src/servicetitan/researchObserver");

class Frame {
  constructor(observations) {
    this.context = vm.createContext({
      URL,
      fetch: async () => ({ status: 204, headers: { get: () => "application/json" } }),
      __grmetroResearchObservation: (value) => observations.push(value)
    });
    vm.runInContext(`globalThis.XMLHttpRequest = class XMLHttpRequest {
      constructor() { this.listeners = {}; this.status = 200; }
      open(method, url) { this.nativeOpen = { method, url }; }
      send() { this.nativeSend = true; }
      addEventListener(name, callback) { this.listeners[name] = callback; }
      getResponseHeader() { return "application/json; charset=utf-8"; }
    }`, this.context);
  }
  evaluate(fn, arg) { return vm.runInContext(`(${fn.toString()})(${JSON.stringify(arg)})`, this.context); }
  run(source) { return vm.runInContext(source, this.context); }
}

class Page extends EventEmitter {
  constructor(frame) { super(); this.frame = frame; this.bindings = 0; this.bindingCalls = 0; }
  frames() { return [this.frame]; }
  url() { return "https://go.servicetitan.com/technician-scorecard"; }
  async exposeBinding(_name, callback) {
    this.bindings += 1;
    this.frame.context.__grmetroResearchObservation = (value) => { this.bindingCalls += 1; return callback({}, value); };
  }
}

function manager(page) {
  const listeners = new Set();
  return {
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    getServiceTitanPage() { return page; },
    stop() { for (const fn of listeners) fn({ type: "stopped" }); }
  };
}

async function settle() { await new Promise((resolve) => setImmediate(resolve)); }

test("verified fetch interception captures GetTechnicianOverview and filters analytics", async () => {
  const observations = [];
  const frame = new Frame(observations);
  const page = new Page(frame);
  const observer = new ServiceTitanResearchObserver({ browserManager: manager(page), clock: () => new Date("2026-08-10T12:00:00Z") });
  const started = await observer.start();
  assert.equal(started.interceptionActive, true);
  assert.equal(started.fetchPatched, true);
  assert.equal(started.xhrPatched, true);
  assert.equal(started.pageUrl, page.url());
  assert.equal(started.frameCount, 1);

  await frame.run(`fetch("https://go.servicetitan.com/app/api/reporting/modulardashboard/GetTechnicianOverview?token=private", { method: "POST" })`);
  await frame.run(`fetch("https://edge.fullstory.com/analytics?session=private")`);
  await frame.run(`fetch("https://example.test/unrelated-analytics")`);
  await settle();
  const results = observer.results();
  assert.equal(results.observedRequestCount, 1);
  assert.equal(results.ignoredRequestCount, 2);
  assert.deepEqual(results.events, [{ timestamp: "2026-08-10T12:00:00.000Z", method: "POST", url: "https://go.servicetitan.com/app/api/reporting/modulardashboard/GetTechnicianOverview", status: 204, contentType: "application/json" }]);
  assert.doesNotMatch(JSON.stringify(results), /private|fullstory/i);
});

test("XHR interception captures reporting requests", async () => {
  const frame = new Frame([]);
  const page = new Page(frame);
  const observer = new ServiceTitanResearchObserver({ browserManager: manager(page) });
  await observer.start();
  frame.run(`globalThis.xhr = new XMLHttpRequest(); xhr.open("POST", "https://go.servicetitan.com/app/api/reporting/modulardashboard/GetTechnicianOverview"); xhr.send()`);
  frame.run("xhr.listeners.loadend()");
  assert.equal(frame.run("xhr.__grmetroResearchRequest.url"), "https://go.servicetitan.com/app/api/reporting/modulardashboard/GetTechnicianOverview");
  assert.equal(frame.run("typeof xhr.listeners.loadend"), "function");
  assert.equal(page.bindingCalls, 1);
  await settle();
  assert.equal(observer.results().count, 1);
  assert.equal(observer.results().events[0].method, "POST");
});

test("repeated start does not double patch and stop restores originals", async () => {
  const frame = new Frame([]);
  frame.run("globalThis.originalFetch = fetch; globalThis.originalOpen = XMLHttpRequest.prototype.open; globalThis.originalSend = XMLHttpRequest.prototype.send");
  const page = new Page(frame);
  const observer = new ServiceTitanResearchObserver({ browserManager: manager(page) });
  await observer.start();
  const patchedFetch = frame.run("fetch");
  await observer.start();
  assert.equal(page.bindings, 1);
  assert.equal(frame.run("fetch") === patchedFetch, true);
  await observer.stop();
  assert.equal(frame.run("fetch === originalFetch && XMLHttpRequest.prototype.open === originalOpen && XMLHttpRequest.prototype.send === originalSend"), true);
});

test("start fails rather than reporting attached when interception cannot be verified", async () => {
  const brokenFrame = { evaluate: async () => { throw new Error("wrong execution context"); } };
  const observer = new ServiceTitanResearchObserver({ browserManager: manager(new Page(brokenFrame)) });
  await assert.rejects(observer.start(), (error) => error.code === "RESEARCH_INTERCEPTION_FAILED");
  assert.equal(observer.results().active, false);
});

test("shutdown restores interception and clears retained results", async () => {
  const frame = new Frame([]);
  const observer = new ServiceTitanResearchObserver({ browserManager: manager(new Page(frame)) });
  await observer.start();
  await frame.run(`fetch("https://go.servicetitan.com/app/api/reporting/test")`);
  await settle();
  assert.equal(observer.results().count, 1);
  await observer.shutdown();
  assert.equal(observer.results().count, 0);
  assert.equal(observer.results().active, false);
});

test("endpoint filter explicitly includes overview and excludes FullStory", () => {
  assert.equal(isObservedEndpoint("https://go.servicetitan.com/app/api/reporting/modulardashboard/GetTechnicianOverview"), true);
  assert.equal(isObservedEndpoint("https://edge.fullstory.com/analytics"), false);
});
