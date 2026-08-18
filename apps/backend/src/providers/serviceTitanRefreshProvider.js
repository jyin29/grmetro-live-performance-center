"use strict";
const technicians = require("../../../../shared/technicians");
const jobClassifications = require("../../../../shared/jobClassifications");
const { normalizeServiceTitanTechnician } = require("../data/normalization");
const { deriveServiceInstallKpis } = require("../data/jobDerivations");
const { buildDashboardPayload } = require("../data/dashboardBuilder");
const { ENDPOINTS } = require("../servicetitan/endpoints");
const { buildAllScorecardRequest, buildTechnicianOverviewRequest, buildTechnicianDatasourceRequest, buildTechnicianJobDrilldownRequest } = require("../servicetitan/requestBuilders");
const { validateJsonResponse } = require("../servicetitan/responseValidation");
const { sanitizeDrilldownRecords } = require("../servicetitan/drilldownSanitizer");
const { ERROR_CODES, ServiceTitanError } = require("../servicetitan/errors");
function diagnostic(error) { return error?.toDiagnostic?.() || { code: error?.code || ERROR_CODES.UNAVAILABLE, retryable: true }; }
async function mapLimited(items, limit, worker) { const results = new Array(items.length); let next = 0; async function run() { while (next < items.length) { const index = next++; results[index] = await worker(items[index], index); } } await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run)); return results; }
function scorecardId(item) { return Number(item?.id ?? item?.technicianId ?? item?.TechnicianId); }
function leadGenerationKpi(item) {
  const lead = item?.leadGeneration?.all; const value = Number(lead?.convRate);
  if (!lead || lead.isEmpty === true || !Number.isFinite(value)) return null;
  // ServiceTitan scorecard rates are normally decimal ratios (0.5 = 50%).
  // Tolerate already-percent values as well so the UI always receives 0..100 percent units.
  return Math.abs(value) <= 1 ? value * 100 : value;
}
class ServiceTitanRefreshProvider {
  constructor({ config, browserManager, executor, logger, technicianConfiguration = technicians, classificationConfiguration = jobClassifications, concurrency = 2, goalsProvider } = {}) { if (!config || !browserManager || !executor) throw new TypeError("Live ServiceTitan provider requires configuration, browser manager, and request executor."); this.config = config; this.browserManager = browserManager; this.executor = executor; this.logger = logger || { info() {}, warn() {} }; this.technicians = technicianConfiguration; this.classifications = classificationConfiguration; this.concurrency = concurrency; this.goalsProvider = goalsProvider; }
  async refreshTechnician(technician, now, dateRange, scorecardById = new Map()) {
    const started = Date.now();
    try {
      const overviewResponse = await this.executor.post(ENDPOINTS.technicianOverview, buildTechnicianOverviewRequest(this.config, technician.id, now, dateRange)); validateJsonResponse(overviewResponse, { endpointName: ENDPOINTS.technicianOverview.name, expectedShape: "object" });
      const datasourceResponse = await this.executor.post(ENDPOINTS.technicianDatasource, buildTechnicianDatasourceRequest(this.config, technician.id, now, dateRange)); const rows = validateJsonResponse(datasourceResponse, { endpointName: ENDPOINTS.technicianDatasource.name, expectedShape: "array" }); const raw = rows.find((row) => Number(row?.TechnicianId) === technician.id); if (!raw) throw new ServiceTitanError(ERROR_CODES.EMPTY_RESULT, "ServiceTitan returned no matching technician result.", { endpointName: ENDPOINTS.technicianDatasource.name });
      const drilldownResponse = await this.executor.post(ENDPOINTS.technicianJobDrilldown, buildTechnicianJobDrilldownRequest(this.config, technician.id, new Date(now), dateRange)); const drilldownRows = validateJsonResponse(drilldownResponse, { endpointName: ENDPOINTS.technicianJobDrilldown.name, expectedShape: "array" }); const jobs = sanitizeDrilldownRecords(drilldownRows).records;
      let derivationDiagnostics; const derivedKpis = deriveServiceInstallKpis(jobs, this.classifications, { onDiagnostics(value) { derivationDiagnostics = value; } }); const normalized = normalizeServiceTitanTechnician(raw, { technicians: this.technicians }); const kpis = { ...normalized.kpis };
      for (const [kpiId, derived] of Object.entries(derivedKpis)) kpis[kpiId] = { ...kpis[kpiId], ...derived };
      const leadValue = leadGenerationKpi(scorecardById.get(technician.id)); if (leadValue !== null) kpis.leadConversionRate = { ...kpis.leadConversionRate, value: leadValue, hasData: true, dataQuality: "confirmed" };
      const record = { ...normalized, kpis, stale: false, available: true, lastSuccessfulUpdate: new Date(now).toISOString() }; const safeDerivationDiagnostics = this.config.developmentRoutesEnabled && !this.config.isProduction ? { drilldownFetched: true, ...derivationDiagnostics } : undefined;
      return { ok: true, technicianId: technician.id, record, duration: Date.now() - started, requests: { overview: overviewResponse.duration, datasource: datasourceResponse.duration, drilldown: drilldownResponse.duration }, ...(safeDerivationDiagnostics ? { derivation: safeDerivationDiagnostics } : {}) };
    } catch (error) { if ([ERROR_CODES.CSRF, ERROR_CODES.AUTH_REQUIRED].includes(error?.code)) this.executor.csrfTokenProvider?.clear?.(); const result = { ok: false, technicianId: technician.id, stale: true, duration: Date.now() - started, error: diagnostic(error) }; this.logger.warn("ServiceTitan technician refresh failed", { technicianId: technician.id, duration: result.duration, code: result.error.code }); return result; }
  }
  async refresh({ now = new Date().toISOString(), date, period = "today", dateRange, previousPayload } = {}) {
    try { this.browserManager.getServiceTitanPage(); } catch (error) { throw new ServiceTitanError(ERROR_CODES.UNAVAILABLE, "The authenticated ServiceTitan browser page is unavailable."); }
    let scorecardById = new Map();
    try { const response = await this.executor.post(ENDPOINTS.allScorecard, buildAllScorecardRequest(this.config, new Date(now), dateRange)); const scorecard = validateJsonResponse(response, { endpointName: ENDPOINTS.allScorecard.name, expectedShape: "object" }); scorecardById = new Map([...(scorecard.originalItems || []), ...(scorecard.items || [])].map((item) => [scorecardId(item), item]).filter(([id]) => Number.isFinite(id))); }
    catch (error) { this.logger.warn("ServiceTitan all-scorecard refresh failed; Lead Conversion will remain unavailable", { code: diagnostic(error).code }); }
    const results = await mapLimited(this.technicians, this.concurrency, (technician) => this.refreshTechnician(technician, now, dateRange, scorecardById)); if (!results.some((result) => result.ok)) throw new ServiceTitanError(ERROR_CODES.UNAVAILABLE, "No ServiceTitan technician refresh succeeded.");
    const previous = new Map((previousPayload?.technicians || []).map((record) => [record.id, record])); const records = results.map((result) => { if (result.ok) return result.record; const retained = previous.get(result.technicianId); if (retained) return { ...retained, stale: true, available: false }; return { ...normalizeServiceTitanTechnician({ TechnicianId: result.technicianId }, { technicians: this.technicians }), kpis: require("../data/normalization/kpi").normalizeKpis({}), stale: true, available: false, lastSuccessfulUpdate: null }; });
    const timestamp = new Date(now).toISOString(); const payload = buildDashboardPayload(records, { now: timestamp, previousPayload, goals: this.goalsProvider?.(), rotationEpoch: previousPayload?.rotationEpoch || timestamp, status: { browser: "connected", serviceTitan: results.every((result) => result.ok) ? "connected" : "partial-failure", cache: "fresh", staleTechnicianCount: results.filter((result) => !result.ok).length } });
    return { ...payload, period, dateRange: dateRange ? { from: dateRange.from, to: dateRange.to } : undefined, provider: "servicetitan", diagnostics: { date: date || null, period, dateRange: dateRange || null, results: results.map(({ record, ...safe }) => ({ ...safe, stale: !safe.ok })) } };
  }
}
module.exports = { ServiceTitanRefreshProvider, mapLimited, leadGenerationKpi, scorecardId };
