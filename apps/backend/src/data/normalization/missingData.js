"use strict";

function isFiniteValue(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function unavailableValue() {
  return { value: null, hasData: false };
}

function normalizeValue(value) {
  return isFiniteValue(value) ? { value, hasData: true } : unavailableValue();
}

module.exports = { isFiniteValue, unavailableValue, normalizeValue };
