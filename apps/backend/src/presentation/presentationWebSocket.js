"use strict";

const { WebSocketServer, WebSocket } = require("ws");

function createPresentationWebSocket({ server, manager, commandBus, logger }) {
  const sockets = new Set();
  const wss = new WebSocketServer({ noServer: true });
  const send = (socket, message) => {
    if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message));
  };
  const broadcast = (state) => {
    for (const client of sockets) if (client.displayId === state.displayId) send(client.socket, { type: "presentation/state", state });
  };
  const unsubscribe = manager.subscribe(broadcast);
  const upgrade = (request, socket, head) => {
    let url;
    try { url = new URL(request.url, "http://127.0.0.1"); } catch { socket.destroy(); return; }
    if (url.pathname !== "/ws/presentation") return;
    const displayId = url.searchParams.get("displayId");
    const clientType = url.searchParams.get("clientType");
    if (!manager.getDisplayState(displayId) || !["display", "remote"].includes(clientType)) { socket.write("HTTP/1.1 400 Bad Request\r\n\r\n"); socket.destroy(); return; }
    wss.handleUpgrade(request, socket, head, (ws) => wss.emit("connection", ws, { displayId, clientType }));
  };
  server.on("upgrade", upgrade);
  wss.on("connection", (socket, details) => {
    const client = { socket, ...details };
    sockets.add(client);
    send(socket, { type: "presentation/state", state: manager.getDisplayState(details.displayId) });
    socket.on("message", (raw) => {
      if (details.clientType !== "remote") { send(socket, { type: "presentation/error", message: "Display clients cannot issue commands." }); return; }
      try {
        const command = JSON.parse(raw.toString());
        if (command.displayId !== details.displayId) throw new RangeError("Command target does not match subscription.");
        commandBus.dispatch(command);
      } catch (error) { send(socket, { type: "presentation/error", message: error.message }); }
    });
    socket.on("close", () => sockets.delete(client));
    socket.on("error", () => sockets.delete(client));
  });
  return Object.freeze({
    close() { unsubscribe(); server.off("upgrade", upgrade); for (const client of sockets) client.socket.close(); sockets.clear(); wss.close(); },
    broadcastDashboardUpdate(payload = {}) {
      const message = { type: "dashboard/update", refreshedAt: payload.refreshedAt || null, period: payload.period || null };
      for (const client of sockets) send(client.socket, message);
    },
    get connectionCount() { return sockets.size; },
    getConnectionSummary() {
      const summary = { total: sockets.size, displays: 0, remotes: 0, byDisplay: {} };
      for (const client of sockets) {
        summary[`${client.clientType}s`] += 1;
        const display = summary.byDisplay[client.displayId] ||= { displays: 0, remotes: 0, total: 0 };
        display[`${client.clientType}s`] += 1;
        display.total += 1;
      }
      return summary;
    },
  });
}

module.exports = { createPresentationWebSocket };
