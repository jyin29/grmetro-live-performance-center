"use strict";
const technicians = require("../../../../shared/technicians");
const { normalizeServiceTitanTechnician } = require("../data/normalization");
const { buildDashboardPayload } = require("../data/dashboardBuilder");
const { ENDPOINTS } = require("../servicetitan/endpoints");
const { buildTechnicianOverviewRequest, buildTechnicianDatasourceRequest } = require("../servicetitan/requestBuilders");
const { validateJsonResponse } = require("../servicetitan/responseValidation");
const { ERROR_CODES, ServiceTitanError } = require("../servicetitan/errors");

function diagnostic(error) { return error?.toDiagnostic?.() || { code: error?.code || ERROR_CODES.UNAVAILABLE, retryable: true }; }
async function mapLimited(items, limit, worker) {
  const results = new Array(items.length); let next = 0;
  async function run() { while (next < items.length) { const index = next++; results[index] = await worker(items[index], index); } }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run)); return results;
}
class ServiceTitanRefreshProvider {
  constructor({ config, browserManager, executor, logger, technicianConfiguration = technicians, concurrency = 2 } = {}) {
    if (!config || !browserManager || !executor) throw new TypeError("Live ServiceTitan provider requires configuration, browser manager, and request executor.");
    this.config = config; this.browserManager = browserManager; this.executor = executor; this.logger = logger || { info() {}, warn() {} }; this.technicians = technicianConfiguration; this.concurrency = concurrency;
  }
  async refreshTechnician(technician, now) {
    const started = Date.now();
    try {
      const overviewResponse = await this.executor.post(ENDPOINTS.technicianOverview, buildTechnicianOverviewRequest(this.config, technician.id, now));
      validateJsonResponse(overviewResponse, { endpointName: ENDPOINTS.technicianOverview.name, expectedShape: "object" });
      const datasourceResponse = await this.executor.post(ENDPOINTS.technicianDatasource, buildTechnicianDatasourceRequest(this.config, technician.id, now));
      const rows = validateJsonResponse(datasourceResponse, { endpointName: ENDPOINTS.technicianDatasource.name, expectedShape: "array" });
      const raw = rows.find((row) => Number(row?.TechnicianId) === technician.id);
      if (!raw) throw new ServiceTitanError(ERROR_CODES.EMPTY_RESULT, "ServiceTitan returned no matching technician result.", { endpointName: ENDPOINTS.technicianDatasource.name });
      const record = { ...normalizeServiceTitanTechnician(raw, { technicians: this.technicians }), stale: false, available: true, lastSuccessfulUpdate: new Date(now).toISOString() };
      return { ok: true, technicianId: technician.id, record, duration: Date.now() - started, requests: { overview: overviewResponse.duration, datasource: datasourceResponse.duration } };
    } catch (error) {
      if ([ERROR_CODES.CSRF, ERROR_CODES.AUTH_REQUIRED].includes(error?.code)) this.executor.csrfTokenProvider?.clear?.();
      const result = { ok: false, technicianId: technician.id, stale: true, duration: Date.now() - started, error: diagnostic(error) };
      this.logger.warn("ServiceTitan technician refresh failed", { technicianId: technician.id, duration: result.duration, code: result.error.code });
      return result;
    }
  }
  async refresh({ now = new Date().toISOString(), date, previousPayload } = {}) {
    try { this.browserManager.getServiceTitanPage(); } catch (error) { throw new ServiceTitanError(ERROR_CODES.UNAVAILABLE, "The authenticated ServiceTitan browser page is unavailable."); }
    const results = await mapLimited(this.technicians, this.concurrency, (technician) => this.refreshTechnician(technician, now));
    if (!results.some((result) => result.ok)) throw new ServiceTitanError(ERROR_CODES.UNAVAILABLE, "No ServiceTitan technician refresh succeeded.");
    const previous = new Map((previousPayload?.technicians || []).map((record) => [record.id, record]));
    const records = results.map((result) => {
      if (result.ok) return result.record;
      const retained = previous.get(result.technicianId);
      if (retained) return { ...retained, stale: true, available: false };
      return { ...normalizeServiceTitanTechnician({ TechnicianId: result.technicianId }, { technicians: this.technicians }), kpis: require("../data/normalization/kpi").normalizeKpis({}), stale: true, available: false, lastSuccessfulUpdate: null };
    });
    const timestamp = new Date(now).toISOString();
    const payload = buildDashboardPayload(records, { now: timestamp, previousPayload, rotationEpoch: previousPayload?.rotationEpoch || timestamp, status: { browser: "connected", serviceTitan: results.every((result) => result.ok) ? "connected" : "partial-failure", cache: "fresh", staleTechnicianCount: results.filter((result) => !result.ok).length } });
    return { ...payload, provider: "servicetitan", diagnostics: { date: date || null, results: results.map(({ record, ...safe }) => ({ ...safe, stale: !safe.ok })) } };
  }
}
module.exports = { ServiceTitanRefreshProvider, mapLimited };
