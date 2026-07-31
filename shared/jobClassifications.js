"use strict";

// PRODUCTION BLOCKER: populate only after GRmetro validates the job types and
// classification rules. Empty lists intentionally prevent guessed mappings.
module.exports = {
  productionReady: false,
  unresolvedReason: "Service and completed-install job classifications require business validation.",
  service: {
    includedJobTypeIds: [],
    includedJobTypeNames: [],
    includedNamePatterns: [],
    excludedJobTypeIds: [],
    excludedJobTypeNames: [],
    excludedNamePatterns: []
  },
  install: {
    includedJobTypeIds: [],
    includedJobTypeNames: [],
    includedNamePatterns: [],
    excludedJobTypeIds: [],
    excludedJobTypeNames: [],
    excludedNamePatterns: []
  }
};
