"use strict";

function requestLogger(logger) {
  return (request, response, next) => {
    const started = process.hrtime.bigint();
    response.on("finish", () => logger.info("HTTP request completed", {
      method: request.method, path: request.originalUrl, statusCode: response.statusCode,
      durationMilliseconds: Number(process.hrtime.bigint() - started) / 1e6,
      remoteAddress: request.ip
    }));
    next();
  };
}

module.exports = { requestLogger };
