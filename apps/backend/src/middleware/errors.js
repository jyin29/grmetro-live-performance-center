"use strict";

const { errorBody } = require("../http/apiError");

function notFound(request, response) {
  response.status(404).json(errorBody("NOT_FOUND", "The requested resource was not found."));
}

function errorHandler({ logger, isProduction }) {
  return (error, request, response, next) => { // eslint-disable-line no-unused-vars
    const status = error.statusCode || error.status || 500;
    const code = error.type === "entity.too.large" ? "INVALID_OVERRIDE" : error.type === "entity.parse.failed" ? "INVALID_JSON" : error.code || "INTERNAL_ERROR";
    const message = code === "INTERNAL_ERROR" ? "An unexpected error occurred." : error.type === "entity.parse.failed" ? "The request body contains malformed JSON." : error.message;
    logger.error("HTTP request failed", { code, errorName: error.name, method: request.method, path: request.originalUrl, statusCode: status });
    const body = errorBody(code, message, error.details ?? null);
    if (!isProduction && error.stack && code === "INTERNAL_ERROR") body.error.stack = error.stack;
    response.status(status).json(body);
  };
}

module.exports = { errorHandler, notFound };
