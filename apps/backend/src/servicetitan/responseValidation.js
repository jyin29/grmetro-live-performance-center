"use strict";
const { ERROR_CODES, ServiceTitanError } = require("./errors");
function safePreview(body) {
  return String(body || "").slice(0, 240)
    .replace(/(x-csrf-token|csrf|cookie|set-cookie)(\s*[":=]\s*)[^,;\s}"']+/gi, "$1$2[REDACTED]")
    .replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, "[REDACTED]")
    .replace(/(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}/g, "[REDACTED]");
}
function failure(code, message, response, endpointName) { throw new ServiceTitanError(code, message, { endpointName, status: response?.status, contentType: response?.contentType || undefined, preview: safePreview(response?.body) || undefined }); }
function validateJsonResponse(response, { endpointName, expectedShape } = {}) {
  if (!response || typeof response !== "object") failure(ERROR_CODES.INVALID_RESPONSE, "ServiceTitan returned an invalid response.", response, endpointName);
  const body = String(response.body || ""); const lowerBody = body.trimStart().toLowerCase(); const finalUrl = String(response.finalUrl || "").toLowerCase();
  if (response.status === 401 || /(?:login|sign-in|authentication|authorize)/.test(finalUrl)) failure(ERROR_CODES.AUTH_REQUIRED, "ServiceTitan login is required.", response, endpointName);
  if (response.status === 403 || /csrf|anti-forgery|antiforgery/.test(lowerBody)) failure(ERROR_CODES.CSRF, "ServiceTitan rejected the current CSRF token.", response, endpointName);
  if (response.status < 200 || response.status >= 300) failure(ERROR_CODES.HTTP, "ServiceTitan returned an unsuccessful HTTP status.", response, endpointName);
  if (/text\/html/i.test(response.contentType || "") || /^<!doctype html/i.test(lowerBody) || /<html|<app-root|servicetitan[^<]*(?:app|shell)/i.test(lowerBody)) failure(ERROR_CODES.INVALID_RESPONSE, "ServiceTitan returned HTML where JSON was expected.", response, endpointName);
  if (/#\/.*technician-scorecard/.test(finalUrl)) failure(ERROR_CODES.INVALID_RESPONSE, "ServiceTitan returned a scorecard page instead of JSON.", response, endpointName);
  if (!body.trim()) failure(ERROR_CODES.EMPTY_RESULT, "ServiceTitan returned an empty response.", response, endpointName);
  let parsed; try { parsed = JSON.parse(body); } catch { failure(ERROR_CODES.INVALID_RESPONSE, "ServiceTitan returned malformed JSON.", response, endpointName); }
  if (expectedShape === "array" && !Array.isArray(parsed)) failure(ERROR_CODES.INVALID_RESPONSE, "ServiceTitan returned an unexpected response shape.", response, endpointName);
  if (expectedShape === "object" && (!parsed || typeof parsed !== "object" || Array.isArray(parsed))) failure(ERROR_CODES.INVALID_RESPONSE, "ServiceTitan returned an unexpected response shape.", response, endpointName);
  return parsed;
}
module.exports = { safePreview, validateJsonResponse };
