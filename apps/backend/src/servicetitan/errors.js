"use strict";
const ERROR_CODES = Object.freeze({ UNAVAILABLE: "SERVICE_TITAN_UNAVAILABLE", AUTH_REQUIRED: "SERVICE_TITAN_AUTH_REQUIRED", CSRF: "SERVICE_TITAN_CSRF_ERROR", INVALID_RESPONSE: "SERVICE_TITAN_INVALID_RESPONSE", TIMEOUT: "SERVICE_TITAN_TIMEOUT", HTTP: "SERVICE_TITAN_HTTP_ERROR", EMPTY_RESULT: "SERVICE_TITAN_EMPTY_RESULT" });
class ServiceTitanError extends Error {
  constructor(code, message, details = {}) { super(message); this.name = "ServiceTitanError"; this.code = code; this.retryable = true; Object.assign(this, details); }
  toDiagnostic() { return Object.freeze({ code: this.code, retryable: this.retryable, ...(this.endpointName ? { endpointName: this.endpointName } : {}), ...(Number.isInteger(this.status) ? { status: this.status } : {}), ...(this.contentType ? { contentType: this.contentType } : {}), ...(this.preview ? { preview: this.preview } : {}) }); }
}
module.exports = { ERROR_CODES, ServiceTitanError };
