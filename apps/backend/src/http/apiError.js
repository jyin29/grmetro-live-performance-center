"use strict";

class ApiError extends Error {
  constructor(statusCode, code, message, details = null) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

function errorBody(code, message, details = null) {
  return { ok: false, error: { code, message, details } };
}

module.exports = { ApiError, errorBody };
