"use strict";

const kpis = require("../../../../../shared/kpis");
const { normalizeValue } = require("./missingData");
const { ratioToPercentage } = require("./percentage");
const { DATA_QUALITY, dataQualityFor } = require("./dataQuality");

const CONFIRMED_DIRECT_FIELDS = Object.freeze({
  revenue: Object.freeze({ field: "CompletedRevenue" }),
  opportunities: Object.freeze({ field: "Opportunity" }),
  techLeads: Object.freeze({ field: "TechLeadJobs" }),
  marketedLeads: Object.freeze({ field: "MarketingLeadJobs" }),
  membershipsSold: Object.freeze({ field: "MembershipsSold" }),
  closingRate: Object.freeze({ field: "CloseRate", convert: ratioToPercentage })
});

function metricRecord(kpiId, value, quality) {
  const normalized = normalizeValue(value);
  return { id: kpiId, label: kpis[kpiId].label, shortLabel: kpis[kpiId].shortLabel, ...normalized, dataQuality: dataQualityFor(normalized.hasData, quality), format: kpis[kpiId].format, unit: kpis[kpiId].unit };
}
function normalizeKpis(raw = {}, { mockValues = null } = {}) {
  const result = {};
  for (const kpiId of Object.keys(kpis)) {
    if (mockValues && Object.hasOwn(mockValues, kpiId)) { result[kpiId] = metricRecord(kpiId, mockValues[kpiId], DATA_QUALITY.FALLBACK); continue; }
    const mapping = CONFIRMED_DIRECT_FIELDS[kpiId]; const sourceValue = mapping ? raw[mapping.field] : null; const value = mapping?.convert ? mapping.convert(sourceValue) : sourceValue;
    result[kpiId] = metricRecord(kpiId, value, DATA_QUALITY.CONFIRMED);
  }
  return result;
}
module.exports = { CONFIRMED_DIRECT_FIELDS, normalizeKpis };
