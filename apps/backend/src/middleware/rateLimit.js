"use strict";

function createRateLimiter({ windowMilliseconds, maxRequests, clock = Date.now } = {}) {
  const clients = new Map();
  return (request, response, next) => {
    const key = request.ip || request.socket?.remoteAddress || "unknown";
    const now = clock();
    if (clients.size > 10000) {
      for (const [client, candidate] of clients) if (now >= candidate.resetAt) clients.delete(client);
    }
    let state = clients.get(key);
    if (!state || now >= state.resetAt) state = { count: 0, resetAt: now + windowMilliseconds };
    state.count += 1;
    clients.set(key, state);
    response.set("RateLimit-Limit", String(maxRequests));
    response.set("RateLimit-Remaining", String(Math.max(0, maxRequests - state.count)));
    response.set("RateLimit-Reset", String(Math.ceil(state.resetAt / 1000)));
    if (state.count > maxRequests) return response.status(429).json({ ok: false, error: { code: "RATE_LIMITED", message: "Too many remote-control requests. Try again later.", details: null } });
    next();
  };
}

module.exports = { createRateLimiter };
