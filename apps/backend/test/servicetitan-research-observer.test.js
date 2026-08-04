"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const EventEmitter = require("node:events");
const { ServiceTitanResearchObserver, isObservedEndpoint, requestBodySummary, summarizeJson } = require("../src/servicetitan/researchObserver");
const classifications = require("../../../shared/jobClassifications");

class Page extends EventEmitter { listenerCountFor(name) { return this.listenerCount(name); } }
function request({ url = "https://go.servicetitan.com/app/api/reporting/CustomReport/GetDatasourceData?datasource=Jobs&parentDatasource=Technicians", method = "POST", body = {} } = {}) {
  return { url: () => url, method: () => method, postDataJSON: () => body };
}
function response(req, { status = 200, contentType = "application/json", data = [] } = {}) {
  return { request: () => req, status: () => status, headers: () => ({ "content-type": contentType, cookie: "private" }), json: async () => data };
}
function manager(page) {
  const listeners = new Set();
  return { page, subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }, getServiceTitanPage() { return this.page; }, change(next) { this.page = next; for (const fn of listeners) fn({ type: "page-changed", page: next }); }, stop() { for (const fn of listeners) fn({ type: "stopped", page: null }); } };
}

test("research observer attaches once, repeated start is idempotent, stop and shutdown detach listeners", () => {
  const page = new Page();
  const observer = new ServiceTitanResearchObserver({ browserManager: manager(page) });
  assert.deepEqual(observer.start(), { active: true, attached: true, eventCount: 0 });
  assert.deepEqual(observer.start(), { active: true, attached: true, eventCount: 0 });
  assert.equal(page.listenerCountFor("request"), 1);
  assert.equal(page.listenerCountFor("response"), 1);
  observer.stop();
  assert.equal(page.listenerCountFor("request"), 0);
  assert.equal(page.listenerCountFor("response"), 0);
  observer.start();
  observer.shutdown();
  assert.equal(page.listenerCountFor("request"), 0);
});

test("observer filters endpoints and extracts datasource, KpiType, body fields, and array schema without values", async () => {
  const page = new Page();
  const observer = new ServiceTitanResearchObserver({ browserManager: manager(page), clock: () => new Date("2026-08-04T12:00:00.000Z") });
  observer.start();
  const ignored = request({ url: "https://go.servicetitan.com/app/api/private/customer", body: { csrf: "token" } });
  page.emit("request", ignored); page.emit("response", response(ignored, { data: [{ Secret: "x" }] }));
  const req = request({ body: { TechnicianId: 134926818, KpiType: 2, From: "2026-08-04", To: "2026-08-04", CustomerName: "Jane", InvoiceNumber: "INV-1", Unknown: "secret" } });
  page.emit("request", req);
  page.emit("response", response(req, { data: [{ JobTypeId: 1, CustomerName: "Jane", Revenue: 12.3 }, { JobTypeId: null, Revenue: 0 }] }));
  await new Promise((resolve) => setImmediate(resolve));
  const results = observer.results();
  assert.equal(results.count, 1);
  const event = results.events[0];
  assert.equal(event.endpoint, "/app/api/reporting/CustomReport/GetDatasourceData");
  assert.equal(event.datasource, "Jobs");
  assert.equal(event.parentDatasource, "Technicians");
  assert.deepEqual(event.request.safeValues, { TechnicianId: "134926818", KpiType: "2", From: "2026-08-04", To: "2026-08-04" });
  assert.ok(event.request.bodyFields.includes("CustomerName"));
  assert.equal(event.response.shape, "array");
  assert.equal(event.response.recordCount, 2);
  assert.deepEqual(event.response.fields.find((field) => field.field === "JobTypeId"), { field: "JobTypeId", types: ["null", "number"], presentInRecords: 2 });
  const serialized = JSON.stringify(results).toLowerCase();
  for (const privateText of ["token", "cookie", "headers", "jane", "inv-1", "secret", "12.3"]) assert.equal(serialized.includes(privateText), false);
});

test("observer summarizes object, malformed json, and html safely", async () => {
  assert.deepEqual(summarizeJson({ data: [{ Status: "Completed" }, { Status: null, JobTypeName: "Install" }] }), { shape: "object", recordCount: 2, fields: [
    { field: "JobTypeName", types: ["string"], presentInRecords: 1 },
    { field: "Status", types: ["null", "string"], presentInRecords: 2 }
  ] });
  const page = new Page();
  const observer = new ServiceTitanResearchObserver({ browserManager: manager(page) });
  observer.start();
  const html = request(); page.emit("request", html); page.emit("response", response(html, { contentType: "text/html", data: "<html>private</html>" }));
  const bad = request({ body: { KpiType: 7 } }); page.emit("request", bad); page.emit("response", { request: () => bad, status: () => 200, headers: () => ({ "content-type": "application/json" }), json: async () => { throw Error("bad raw"); } });
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(observer.results().events.map((event) => event.response.shape), ["html", "malformed-json"]);
});

test("observer keeps bounded storage and handles page changes", async () => {
  const first = new Page(); const mgr = manager(first);
  const observer = new ServiceTitanResearchObserver({ browserManager: mgr, maxEvents: 2 });
  observer.start();
  const second = new Page(); mgr.change(second);
  assert.equal(first.listenerCountFor("request"), 0);
  assert.equal(second.listenerCountFor("request"), 1);
  for (let index = 0; index < 3; index += 1) { const req = request({ body: { KpiType: index } }); second.emit("request", req); second.emit("response", response(req, { data: [{ Field: index }] })); }
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(observer.results().count, 2);
});

test("pure filters and request summary approve only safe scalar request values", () => {
  assert.equal(isObservedEndpoint("https://x/app/api/reporting/modulardashboard/GetTechnicianOverview"), true);
  assert.equal(isObservedEndpoint("https://x/GetDatasourceForTechScorecards?name=Technicians"), true);
  assert.equal(isObservedEndpoint("https://x/customer/invoice"), false);
  assert.deepEqual(requestBodySummary(request({ body: { TechnicianId: 1, KpiType: 7, Nested: { private: true }, Cookie: "x", Token: "y" } })), { bodyFields: ["KpiType", "Nested", "TechnicianId"], safeValues: { KpiType: "7", TechnicianId: "1" } });
  assert.equal(classifications.classificationApproved, false);
});
