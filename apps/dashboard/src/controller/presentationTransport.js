const RECONNECT_MINIMUM_MS = 500;
const RECONNECT_MAXIMUM_MS = 10000;
const DASHBOARD_UPDATE_EVENT = "grmetro:dashboard-update";

export function createWebSocketPresentationTransport({ displayId, clientType, onState, onConnectionChange, onReconnectAttempt,
  WebSocketImpl = WebSocket, location = window.location, schedule = setTimeout, cancel = clearTimeout,
  reconnectMinimumMs = RECONNECT_MINIMUM_MS, reconnectMaximumMs = RECONNECT_MAXIMUM_MS } = {}) {
  let socket = null;
  let reconnectTimer = null;
  let retryDelay = reconnectMinimumMs;
  let stopped = false;
  let socketToReplace = null;
  const protocol = location.protocol === "https:" ? "wss:" : "ws:";
  const url = `${protocol}//${location.host}/ws/presentation?displayId=${encodeURIComponent(displayId)}&clientType=${clientType}`;

  function connect() {
    if (stopped) return;
    onConnectionChange?.("connecting");
    const currentSocket = new WebSocketImpl(url);
    socket = currentSocket;
    currentSocket.addEventListener("open", () => { retryDelay = reconnectMinimumMs; onConnectionChange?.("connected"); });
    currentSocket.addEventListener("message", (event) => {
      let message;
      try { message = JSON.parse(event.data); } catch { return; }
      if (message.type === "presentation/state" && message.state?.displayId === displayId) onState(message.state);
      if (message.type === "dashboard/update") window.dispatchEvent(new CustomEvent(DASHBOARD_UPDATE_EVENT, { detail: message }));
    });
    currentSocket.addEventListener("close", () => {
      if (socketToReplace === currentSocket) { socketToReplace = null; return; }
      onConnectionChange?.("reconnecting");
      if (!stopped) { onReconnectAttempt?.(); reconnectTimer = schedule(connect, retryDelay); retryDelay = Math.min(retryDelay * 2, reconnectMaximumMs); }
    });
    currentSocket.addEventListener("error", () => currentSocket.close());
  }
  connect();
  return Object.freeze({
    send(command) {
      if (!socket || socket.readyState !== WebSocketImpl.OPEN) throw new Error("Presentation controller is reconnecting.");
      socket.send(JSON.stringify(command));
    },
    reconnect() {
      if (stopped) return;
      if (reconnectTimer) cancel(reconnectTimer);
      reconnectTimer = null;
      if (socket) { socketToReplace = socket; socket.close(); }
      connect();
    },
    close() { stopped = true; if (reconnectTimer) cancel(reconnectTimer); socket?.close(); },
  });
}
