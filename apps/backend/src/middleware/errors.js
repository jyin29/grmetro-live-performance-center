"use strict";

function notFound(request, response) {
  response.status(404).json({ error: { code: "NOT_FOUND", message: "The requested resource was not found." } });
}

function errorHandler({ logger, isProduction }) {
  return (error, request, response, next) => { // eslint-disable-line no-unused-vars
    const status = error.statusCode || error.status || 500;
    const code = error.type === "entity.too.large" ? "REQUEST_TOO_LARGE" : error.type === "entity.parse.failed" ? "INVALID_JSON" : "INTERNAL_ERROR";
    const message = status >= 500 ? "An unexpected error occurred." : error.message;
    logger.error("HTTP request failed", { error, method: request.method, path: request.originalUrl, statusCode: status });
    const body = { error: { code, message } };
    if (!isProduction && error.stack) body.error.stack = error.stack;
    response.status(status).json(body);
  };
}

module.exports = { errorHandler, notFound };
