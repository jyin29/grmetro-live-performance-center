"use strict";

function pleasantMaximum(largest) {
  if (!(largest > 0)) return 1;
  const target = largest * 1.1;
  const magnitude = 10 ** Math.floor(Math.log10(target));
  const normalized = target / magnitude;
  const pleasant = [1, 1.5, 2, 2.5, 5, 10].find((value) => value >= normalized) || 10;
  return pleasant * magnitude;
}

function tickStep(maximum) {
  for (const count of [5, 4, 6]) if (Number.isInteger(maximum / count)) return maximum / count;
  return maximum / 5;
}

function buildAxis(values, { format = "integer", percentage = false } = {}) {
  const maximum = percentage ? 100 : pleasantMaximum(Math.max(0, ...(values || []).filter((value) => typeof value === "number" && Number.isFinite(value))));
  const step = percentage ? 20 : tickStep(maximum);
  const tickValues = [];
  for (let value = 0; value < maximum; value += step) tickValues.push(Number(value.toPrecision(12)));
  tickValues.push(maximum);
  return { minimum: 0, maximum, tickValues, format, compact: format === "currency" || maximum >= 1000 };
}

module.exports = { pleasantMaximum, buildAxis };
