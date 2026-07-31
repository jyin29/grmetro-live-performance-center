"use strict";

function installGracefulShutdown({ server, logger, processTarget = process, timeoutMilliseconds = 10000 } = {}) {
  let shuttingDown = false;
  const shutdown = (signal) => {
    if (shuttingDown) return Promise.resolve();
    shuttingDown = true;
    logger.info("Graceful shutdown started", { signal });
    return new Promise((resolve) => {
      const timer = setTimeout(() => { logger.warn("Graceful shutdown timed out"); resolve(); }, timeoutMilliseconds);
      timer.unref?.();
      server.close((error) => {
        clearTimeout(timer);
        if (error) logger.error("HTTP server shutdown failed", { error });
        else logger.info("Graceful shutdown complete");
        resolve();
      });
    });
  };
  const handlers = { SIGINT: () => void shutdown("SIGINT"), SIGTERM: () => void shutdown("SIGTERM") };
  for (const [signal, handler] of Object.entries(handlers)) processTarget.once(signal, handler);
  return { shutdown, remove: () => Object.entries(handlers).forEach(([signal, handler]) => processTarget.removeListener(signal, handler)) };
}

module.exports = { installGracefulShutdown };
