"use strict";

const SAFE_REQUEST_VALUE_KEYS = new Set(["TechnicianId", "technicianId", "KpiType", "From", "To"]);
const MAX_EVENTS = 100;
const DISCOVERY_TERMS = [
  "service revenue", "install revenue", "install average ticket", "install avg ticket",
  "install ticket", "install count", "installs", "number of installs", "install jobs",
  "service jobs", "service calls", "billable service", "install sales", "service sales"
];
const METADATA_KEYS = new Set(["metricid", "kpiid", "id", "label", "displayname", "title", "internalname", "fieldname", "field", "columnname", "name", "datasource", "datasourcename", "chartname", "groupname", "group", "valuetype", "datatype", "type"]);

function normalizedSearchText(value) { return String(value || "").replace(/([a-z])([A-Z])/g, "$1 $2").replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim().toLowerCase(); }
function matchedTerms(value) { const text = normalizedSearchText(value); return DISCOVERY_TERMS.filter((term) => text.includes(term)); }
function firstSafeString(object, keys) {
  for (const [key, value] of Object.entries(object)) if (keys.includes(key.toLowerCase()) && ["string", "number"].includes(typeof value)) return String(value);
  return null;
}
function isMetricMetadata(object) {
  const keys = Object.keys(object).map((key) => key.toLowerCase());
  const descriptorCount = keys.filter((key) => METADATA_KEYS.has(key)).length;
  return descriptorCount >= 2 && keys.some((key) => ["metricid", "kpiid", "id", "label", "displayname", "title", "internalname", "fieldname", "field", "columnname", "name"].includes(key));
}
function safeMetadataMatch(object, endpointDatasource) {
  if (!isMetricMetadata(object)) return null;
  const searchable = Object.entries(object).filter(([key, value]) => METADATA_KEYS.has(key.toLowerCase()) && ["string", "number"].includes(typeof value));
  const terms = sortedUnique(searchable.flatMap(([key, value]) => [...matchedTerms(key), ...matchedTerms(value)]));
  if (!terms.length) return null;
  return {
    endpointDatasource: endpointDatasource || null,
    datasource: firstSafeString(object, ["datasource", "datasourcename"]) || endpointDatasource || null,
    metricId: firstSafeString(object, ["metricid", "kpiid", "id"]),
    label: firstSafeString(object, ["label", "displayname", "title"]),
    internalFieldName: firstSafeString(object, ["internalname", "fieldname", "field", "columnname", "name"]),
    chartOrGroupName: firstSafeString(object, ["chartname", "groupname", "group"]),
    valueType: firstSafeString(object, ["valuetype", "datatype", "type"]),
    matchedTerms: terms
  };
}
function discoverNativeKpis(data, endpointDatasource = null) {
  const metadataMatches = [];
  const valueMatchMap = new Map();
  function visit(value) {
    if (Array.isArray(value)) { for (const item of value) visit(item); return; }
    if (!isPlainObject(value)) return;
    const metadata = safeMetadataMatch(value, endpointDatasource);
    if (metadata) metadataMatches.push(metadata);
    for (const [field, fieldValue] of Object.entries(value)) {
      if (!metadata && matchedTerms(field).length) {
        const key = `${field}:${valueType(fieldValue)}`;
        valueMatchMap.set(key, { fieldName: field, detectedType: valueType(fieldValue), present: true, matchedTerms: matchedTerms(field) });
      }
      if (fieldValue !== null && typeof fieldValue === "object") visit(fieldValue);
    }
  }
  visit(data);
  return { metadataMatches, valueMatches: [...valueMatchMap.values()] };
}
function desiredKpiForTerms(terms) {
  const joined = terms.join("|");
  if (/service revenue/.test(joined)) return ["Service Revenue", "FOUND"];
  if (/service sales/.test(joined)) return ["Service Revenue", "POSSIBLE ALIAS"];
  if (/install revenue/.test(joined)) return ["Install Revenue", "FOUND"];
  if (/install sales/.test(joined)) return ["Install Revenue", "POSSIBLE ALIAS"];
  if (/install average ticket|install avg ticket/.test(joined)) return ["Install Average Ticket", "FOUND"];
  if (/install ticket/.test(joined)) return ["Install Average Ticket", "POSSIBLE ALIAS"];
  if (/number of installs|install count/.test(joined)) return ["Number of Installs", "FOUND"];
  if (/install jobs|installs/.test(joined)) return ["Number of Installs", "POSSIBLE ALIAS"];
  return null;
}
function buildNativeKpiDiscoveryReport(events) {
  const names = ["Service Revenue", "Install Revenue", "Number of Installs", "Install Average Ticket"];
  const findings = new Map(names.map((name) => [name, { status: "NOT FOUND", candidateFieldNames: [] }]));
  for (const event of events) for (const match of [...(event.response.metadataMatches || []), ...(event.response.valueMatches || [])]) {
    const classification = desiredKpiForTerms(match.matchedTerms || []);
    if (!classification) continue;
    const [name, status] = classification; const current = findings.get(name);
    if (status === "FOUND" || current.status === "NOT FOUND") current.status = status;
    const candidate = match.internalFieldName || match.fieldName || match.label;
    if (candidate) current.candidateFieldNames.push(candidate);
  }
  return names.map((name) => ({ kpi: name, status: findings.get(name).status, candidateFieldNames: sortedUnique(findings.get(name).candidateFieldNames) }));
}

function isPlainObject(value) { return value !== null && typeof value === "object" && !Array.isArray(value); }
function valueType(value) {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}
function sortedUnique(values) { return [...new Set(values)].sort(); }
function safeUrlParts(url) {
  try {
    const parsed = new URL(url);
    return { path: parsed.pathname, datasource: parsed.searchParams.get("datasource") || parsed.searchParams.get("name") || null, parentDatasource: parsed.searchParams.get("parentDatasource") || null };
  } catch { return { path: null, datasource: null, parentDatasource: null }; }
}
function safeDiagnosticUrl(url) {
  try {
    const parsed = new URL(url);
    return `${parsed.origin}${parsed.pathname}`;
  } catch { return null; }
}
function isObservedEndpoint(url) {
  const text = String(url || "");
  return text.includes("/app/api/reporting/") || text.includes("GetDatasourceData") || text.includes("GetDatasourceForTechScorecards") || /modular.*dashboard|dashboard.*reporting/i.test(text);
}
function isSensitiveFieldName(field) { return /csrf|cookie|session|token|authorization|password|secret|email|phone|address/i.test(String(field || "")); }
function requestBodySummary(request) {
  let body = null;
  try { body = typeof request.postDataJSON === "function" ? request.postDataJSON() : null; } catch { body = null; }
  if (!isPlainObject(body)) return { bodyFields: [], safeValues: {} };
  const bodyFields = Object.keys(body).filter((field) => !isSensitiveFieldName(field)).sort();
  const safeValues = {};
  for (const field of bodyFields) {
    if (!SAFE_REQUEST_VALUE_KEYS.has(field) || isSensitiveFieldName(field)) continue;
    const value = body[field];
    if (["string", "number", "boolean"].includes(typeof value)) safeValues[field] = String(value);
  }
  return { bodyFields, safeValues };
}
function shapeOf(data) {
  if (Array.isArray(data)) return "array";
  if (isPlainObject(data)) return "object";
  return valueType(data);
}
function schemaForRecords(records) {
  const fieldMap = new Map();
  for (const record of records) {
    if (!isPlainObject(record)) continue;
    for (const [field, value] of Object.entries(record)) {
      if (!fieldMap.has(field)) fieldMap.set(field, { types: new Set(), presentInRecords: 0 });
      const item = fieldMap.get(field);
      item.types.add(valueType(value));
      item.presentInRecords += 1;
    }
  }
  return [...fieldMap.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([field, details]) => ({ field, types: sortedUnique(details.types), presentInRecords: details.presentInRecords }));
}
function summarizeJson(data) {
  if (Array.isArray(data)) return { shape: "array", recordCount: data.length, fields: schemaForRecords(data) };
  if (isPlainObject(data)) {
    const records = Array.isArray(data.Data) ? data.Data : Array.isArray(data.data) ? data.data : Array.isArray(data.records) ? data.records : null;
    return { shape: "object", recordCount: records ? records.length : null, fields: records ? schemaForRecords(records) : schemaForRecords([data]) };
  }
  return { shape: valueType(data), recordCount: null, fields: [] };
}
function summarizeNonJson(contentType) { return { shape: /html/i.test(contentType || "") ? "html" : "non-json", recordCount: null, fields: [] }; }

class ServiceTitanResearchObserver {
  constructor({ browserManager, clock = () => new Date(), maxEvents = MAX_EVENTS, logger } = {}) {
    if (!browserManager) throw new TypeError("ServiceTitanResearchObserver requires a browser manager.");
    this.browserManager = browserManager;
    this.clock = clock;
    this.maxEvents = maxEvents;
    this.logger = logger || { warn() {}, debug() {} };
    this.events = [];
    this.urlDiagnostics = [];
    this.ignoredEventCount = 0;
    this.selectedPageTitle = null;
    this.active = false;
    this.page = null;
    this.unsubscribeBrowser = null;
    this.onRequest = this.handleRequest.bind(this);
    this.onResponse = this.handleResponse.bind(this);
    this.requests = new WeakMap();
  }
  start() {
    if (this.active) {
      try { this.attachPage(this.browserManager.getServiceTitanPage()); } catch { /* diagnostics retain the current attachment */ }
      return this.status();
    }
    this.active = true;
    this.unsubscribeBrowser = this.browserManager.subscribe?.((event) => {
      if (event.type === "page-changed") this.attachPage(event.page);
      if (["disconnected", "stopped"].includes(event.type)) this.detachPage();
    }) || null;
    try { this.attachPage(this.browserManager.getServiceTitanPage()); } catch (error) { this.logger.warn("ServiceTitan research observer could not attach yet", { code: error.code || "OBSERVER_ATTACH_FAILED" }); }
    return this.status();
  }
  stop() { this.active = false; this.detachPage(); this.unsubscribeBrowser?.(); this.unsubscribeBrowser = null; return this.status(); }
  clear() { this.events = []; this.urlDiagnostics = []; this.ignoredEventCount = 0; }
  shutdown() { this.stop(); this.clear(); }
  attachPage(page) {
    if (!this.active || !page || page === this.page) return;
    this.detachPage();
    this.page = page;
    page.on?.("request", this.onRequest);
    page.on?.("response", this.onResponse);
    this.selectedPageTitle = null;
    Promise.resolve(page.title?.()).then((title) => { if (this.page === page) this.selectedPageTitle = String(title || ""); }).catch(() => {});
  }
  detachPage() { if (this.page) { this.page.off?.("request", this.onRequest); this.page.off?.("response", this.onResponse); } this.page = null; this.selectedPageTitle = null; }
  handleRequest(request) {
    const url = request.url?.() || "";
    const diagnosticUrl = safeDiagnosticUrl(url);
    this.urlDiagnostics.push({ timestamp: this.clock().toISOString(), method: request.method?.() || null, url: diagnosticUrl });
    while (this.urlDiagnostics.length > this.maxEvents) this.urlDiagnostics.shift();
    if (!isObservedEndpoint(url)) { this.ignoredEventCount += 1; return; }
    const parts = safeUrlParts(url);
    this.requests.set(request, { timestamp: this.clock().toISOString(), method: request.method?.() || null, endpoint: parts.path, datasource: parts.datasource, parentDatasource: parts.parentDatasource, ...requestBodySummary(request) });
  }
  async handleResponse(response) {
    const request = response.request?.();
    const observed = request ? this.requests.get(request) : null;
    if (!observed) return;
    const contentType = response.headers?.()["content-type"] || response.headers?.()["Content-Type"] || "";
    let summary = summarizeNonJson(contentType);
    if (/json/i.test(contentType)) {
      try {
        const data = await response.json();
        const discovery = discoverNativeKpis(data, observed.datasource);
        discovery.metadataMatches = discovery.metadataMatches.map((match) => ({ endpoint: observed.endpoint, ...match }));
        discovery.valueMatches = discovery.valueMatches.map((match) => ({ endpoint: observed.endpoint, ...match }));
        summary = { ...summarizeJson(data), ...discovery };
      } catch { summary = { shape: "malformed-json", recordCount: null, fields: [], metadataMatches: [], valueMatches: [] }; }
    }
    this.add({ timestamp: observed.timestamp, endpoint: observed.endpoint, datasource: observed.datasource, parentDatasource: observed.parentDatasource, request: { method: observed.method, bodyFields: observed.bodyFields, safeValues: observed.safeValues }, response: { status: response.status?.() || null, contentType: contentType ? contentType.split(";")[0] : null, ...summary } });
  }
  add(event) { this.events.push(event); while (this.events.length > this.maxEvents) this.events.shift(); }
  diagnostics() {
    let contexts = [];
    try { contexts = this.browserManager.getBrowser?.().contexts?.() || []; } catch { contexts = []; }
    const pages = contexts.flatMap((context) => context.pages?.() || []);
    return {
      selectedPageUrl: safeDiagnosticUrl(this.page?.url?.()), selectedPageTitle: this.selectedPageTitle,
      browserContextCount: contexts.length, pageCount: pages.length, frameCount: this.page?.frames?.().length || 0,
      listenerAttached: Boolean(this.page), listenerActive: this.active && Boolean(this.page),
      retainedEventCount: this.events.length, ignoredEventCount: this.ignoredEventCount
    };
  }
  status() { return { active: this.active, attached: Boolean(this.page), eventCount: this.events.length, diagnostics: this.diagnostics() }; }
  results() { return { ...this.status(), maxEvents: this.maxEvents, count: this.events.length, endpointsSearched: sortedUnique(this.events.map((event) => event.endpoint).filter(Boolean)), nativeKpiDiscoveryReport: buildNativeKpiDiscoveryReport(this.events), urlDiagnostics: this.urlDiagnostics.map((item) => ({ ...item })), events: this.events.map((event) => JSON.parse(JSON.stringify(event))) }; }
}

module.exports = { ServiceTitanResearchObserver, isObservedEndpoint, requestBodySummary, summarizeJson, discoverNativeKpis, buildNativeKpiDiscoveryReport, safeUrlParts, safeDiagnosticUrl };
