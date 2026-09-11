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
  let generation = 0;
  const protocol = location.protocol === "https:" ? "wss:" : "ws:";
  const url = `${protocol}//${location.host}/ws/presentation?displayId=${encodeURIComponent(displayId)}&clientType=${clientType}`;

  function scheduleReconnect() {
    if (stopped || reconnectTimer) return;
    onConnectionChange?.("reconnecting");
    onReconnectAttempt?.();
    const jitter = Math.floor(Math.random() * Math.max(100, retryDelay * 0.25));
    const delay = Math.min(reconnectMaximumMs, retryDelay + jitter);
    reconnectTimer = schedule(() => { reconnectTimer = null; connect(); }, delay);
    retryDelay = Math.min(retryDelay * 2, reconnectMaximumMs);
  }

  function connect() {
    if (stopped) return;
    const myGeneration = ++generation;
    onConnectionChange?.("connecting");
    let currentSocket;
    try { currentSocket = new WebSocketImpl(url); } catch { scheduleReconnect(); return; }
    socket = currentSocket;
    currentSocket.addEventListener("open", () => {
      if (stopped || myGeneration !== generation) return;
      retryDelay = reconnectMinimumMs;
      onConnectionChange?.("connected");
    });
    currentSocket.addEventListener("message", (event) => {
      if (stopped || myGeneration !== generation) return;
      let message;
      try { message = JSON.parse(event.data); } catch { return; }
      if (message.type === "presentation/state" && message.state?.displayId === displayId) onState(message.state);
      if (message.type === "dashboard/update") window.dispatchEvent(new CustomEvent(DASHBOARD_UPDATE_EVENT, { detail: message }));
    });
    currentSocket.addEventListener("close", () => {
      if (stopped || myGeneration !== generation) return;
      scheduleReconnect();
    });
    currentSocket.addEventListener("error", () => { try { currentSocket.close(); } catch {} });
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
      generation += 1;
      try { socket?.close(); } catch {}
      socket = null;
      retryDelay = reconnectMinimumMs;
      connect();
    },
    close() {
      stopped = true;
      generation += 1;
      if (reconnectTimer) cancel(reconnectTimer);
      reconnectTimer = null;
      try { socket?.close(); } catch {}
      socket = null;
    },
  });
}
