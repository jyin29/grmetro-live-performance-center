"use strict";

const { loadCompanyConfig } = require("./companyConfig");

const fallback = {
  productionReady: false,
  classificationApproved: false,
  excludeRecalls: true,
  excludeWarranty: true,
  excludeNoCharge: true,
  unresolvedReason: "Service and install job classifications require business validation.",
  service: {
    includedJobTypeIds: [], includedJobTypeNames: [], includedNamePatterns: [],
    excludedJobTypeIds: [], excludedJobTypeNames: [], excludedNamePatterns: []
  },
  install: {
    includedJobTypeIds: [], includedJobTypeNames: [], includedNamePatterns: [],
    excludedJobTypeIds: [], excludedJobTypeNames: [], excludedNamePatterns: []
  }
};

module.exports = loadCompanyConfig().jobClassifications || fallback;
