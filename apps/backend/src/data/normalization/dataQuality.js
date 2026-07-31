"use strict";

const DATA_QUALITY = Object.freeze({
  CONFIRMED: "confirmed", DERIVED: "derived", FALLBACK: "fallback", UNAVAILABLE: "unavailable"
});

function dataQualityFor(hasData, requestedQuality = DATA_QUALITY.CONFIRMED) {
  return hasData ? requestedQuality : DATA_QUALITY.UNAVAILABLE;
}

module.exports = { DATA_QUALITY, dataQualityFor };
