const RECONNECT_MINIMUM_MS = 500;
const RECONNECT_MAXIMUM_MS = 10000;

export function createWebSocketPresentationTransport({ displayId, clientType, onState, onConnectionChange,
  WebSocketImpl = WebSocket, location = window.location, schedule = setTimeout, cancel = clearTimeout } = {}) {
  let socket = null;
  let reconnectTimer = null;
  let retryDelay = RECONNECT_MINIMUM_MS;
  let stopped = false;
  const protocol = location.protocol === "https:" ? "wss:" : "ws:";
  const url = `${protocol}//${location.host}/ws/presentation?displayId=${encodeURIComponent(displayId)}&clientType=${clientType}`;

  function connect() {
    if (stopped) return;
    onConnectionChange?.("connecting");
    socket = new WebSocketImpl(url);
    socket.addEventListener("open", () => { retryDelay = RECONNECT_MINIMUM_MS; onConnectionChange?.("connected"); });
    socket.addEventListener("message", (event) => {
      let message;
      try { message = JSON.parse(event.data); } catch { return; }
      if (message.type === "presentation/state" && message.state?.displayId === displayId) onState(message.state);
    });
    socket.addEventListener("close", () => {
      onConnectionChange?.("reconnecting");
      if (!stopped) { reconnectTimer = schedule(connect, retryDelay); retryDelay = Math.min(retryDelay * 2, RECONNECT_MAXIMUM_MS); }
    });
    socket.addEventListener("error", () => socket.close());
  }
  connect();
  return Object.freeze({
    send(command) {
      if (!socket || socket.readyState !== WebSocketImpl.OPEN) throw new Error("Presentation controller is reconnecting.");
      socket.send(JSON.stringify(command));
    },
    close() { stopped = true; if (reconnectTimer) cancel(reconnectTimer); socket?.close(); },
  });
}
