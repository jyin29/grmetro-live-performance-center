import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { DEFAULT_DISPLAY_ID, findDisplay, PRESENTATION_DISPLAYS } from "../config/displayRegistry";
import { PRESENTATION_SLIDES } from "../config/slideRegistry";
import { createWebSocketPresentationTransport } from "./presentationTransport";
import { RUNTIME_SETTINGS } from "../config/runtimeSettings";

const PresentationControllerContext = createContext(null);
const slideCount = PRESENTATION_SLIDES.length;
const POLL_MS = 1000;
const DISPLAY_HEARTBEAT_MS = 2000;
const HTTP_FAILURES_BEFORE_OFFLINE = 6;

async function requestJson(path, options = {}) {
  const response = await fetch(path, { cache: "no-store", ...options });
  if (!response.ok) throw new Error(`presentation request failed (${response.status})`);
  return response.json();
}
function sleep(ms) { return new Promise((resolve) => window.setTimeout(resolve, ms)); }

export function PresentationControllerProvider({ children }) { return <PresentationControllerContext.Provider value={true}>{children}</PresentationControllerContext.Provider>; }

export function usePresentationController(requestedDisplayId = DEFAULT_DISPLAY_ID, clientType = "display") {
  if (!useContext(PresentationControllerContext)) throw new Error("usePresentationController must be used within PresentationControllerProvider");
  const displayId = findDisplay(requestedDisplayId)?.id ?? DEFAULT_DISPLAY_ID;
  const display = findDisplay(displayId);
  const [state, setState] = useState({ displayId, displayName: display.name, presentationProfile: display.presentationProfile, activeSlideIndex: 0, isRunning: true, timerRevision: 0, lastUpdated: null });
  const [transportState, setTransportState] = useState("connecting");
  const [online, setOnline] = useState(clientType === "display");
  const [runtime, setRuntime] = useState({ reconnectCount: 0, lastSynchronization: null, lastCommandError: null, lastCommandAt: null, httpHealthy: false, heartbeatHealthy: clientType !== "display", recoveryLevel: 0 });
  const [transport, setTransport] = useState(null);
  const commandRef = useRef({ busy: false, sequence: 0 });

  const acceptState = useCallback((next) => {
    if (!next || next.displayId !== displayId) return;
    setState(next);
    setRuntime((current) => ({ ...current, lastSynchronization: Date.now(), recoveryLevel: 0 }));
  }, [displayId]);

  useEffect(() => {
    let ws;
    try {
      ws = createWebSocketPresentationTransport({ displayId, clientType, location: window.location,
        reconnectMinimumMs: RUNTIME_SETTINGS.reconnectMinimumMs, reconnectMaximumMs: RUNTIME_SETTINGS.reconnectMaximumMs,
        onState: acceptState, onConnectionChange: setTransportState,
        onReconnectAttempt: () => setRuntime((current) => ({ ...current, reconnectCount: current.reconnectCount + 1, recoveryLevel: Math.max(current.recoveryLevel, 2) })), });
      setTransport(ws);
    } catch { setTransportState("reconnecting"); }
    return () => ws?.close();
  }, [acceptState, clientType, displayId]);

  useEffect(() => {
    let active = true; let failures = 0;
    const poll = async () => {
      try {
        const payload = await requestJson(`/api/v1/presentation/${encodeURIComponent(displayId)}`);
        if (!active) return;
        failures = 0; acceptState(payload.state);
        setRuntime((current) => ({ ...current, httpHealthy: true }));
        if (clientType === "remote") setOnline(payload.online === true);
      } catch {
        if (!active) return;
        failures += 1;
        setRuntime((current) => ({ ...current, httpHealthy: false, recoveryLevel: Math.max(current.recoveryLevel, 1) }));
        if (clientType === "remote" && failures >= HTTP_FAILURES_BEFORE_OFFLINE) setOnline(false);
        if (failures === 3 || failures === HTTP_FAILURES_BEFORE_OFFLINE) transport?.reconnect();
      }
    };
    poll(); const timer = window.setInterval(poll, POLL_MS);
    return () => { active = false; window.clearInterval(timer); };
  }, [acceptState, clientType, displayId, transport]);

  useEffect(() => {
    if (clientType !== "display") return undefined;
    let active = true; let failures = 0;
    const beat = async () => {
      try {
        await requestJson(`/api/v1/presentation/${encodeURIComponent(displayId)}/heartbeat`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
        if (active) { failures = 0; setOnline(true); setRuntime((current) => ({ ...current, heartbeatHealthy: true })); }
      } catch {
        if (!active) return; failures += 1;
        setRuntime((current) => ({ ...current, heartbeatHealthy: false, recoveryLevel: Math.max(current.recoveryLevel, 1) }));
        // WebSocket and HTTP state are redundant evidence. Do not declare the TV dead after one missed heartbeat.
        if (failures >= 4 && transportState !== "connected") setOnline(false);
      }
    };
    beat(); const timer = window.setInterval(beat, DISPLAY_HEARTBEAT_MS);
    return () => { active = false; window.clearInterval(timer); };
  }, [clientType, displayId, transportState]);

  const action = useCallback(async (name, payload = {}) => {
    if (commandRef.current.busy) return null;
    commandRef.current.busy = true;
    const sequence = ++commandRef.current.sequence;
    try {
      const query = name === "select" ? `?index=${encodeURIComponent(payload.index)}` : "";
      const body = JSON.stringify({ ...payload, commandId: `${displayId}-${Date.now()}-${sequence}` });
      let lastError;
      for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
          const result = await requestJson(`/api/v1/presentation/${encodeURIComponent(displayId)}/action/${name}${query}`, { method: "POST", headers: { "Content-Type": "application/json", "X-GRMETRO-Command-Id": `${displayId}-${sequence}` }, body });
          acceptState(result.state);
          if (clientType === "remote" && typeof result.online === "boolean") setOnline(result.online);
          setRuntime((current) => ({ ...current, lastCommandAt: Date.now(), lastCommandError: null }));
          return result;
        } catch (error) { lastError = error; if (attempt === 0) await sleep(250); }
      }
      throw lastError;
    } catch (error) {
      setRuntime((current) => ({ ...current, lastCommandAt: Date.now(), lastCommandError: error.message, recoveryLevel: Math.max(current.recoveryLevel, 1) }));
      console.error("Presentation action failed", { displayId, clientType, name, error }); return null;
    } finally { commandRef.current.busy = false; }
  }, [acceptState, clientType, displayId]);

  const connectionState = clientType === "remote" ? (online ? "connected" : "offline") : (online || transportState === "connected" ? "connected" : "reconnecting");
  return useMemo(() => ({ ...state, ...runtime, transportState, connectionState, targetDisplayOnline: online,
    activeSlide: PRESENTATION_SLIDES[state.activeSlideIndex % slideCount], displays: PRESENTATION_DISPLAYS, slides: PRESENTATION_SLIDES,
    nextSlide: () => action("next"), previousSlide: () => action("previous"), pauseRotation: () => action("pause"), resumeRotation: () => action("resume"), restartRotationTimer: () => action("restart"), selectSlide: (index) => action("select", { index }),
    setRuntimePaused: () => {}, reconnect: () => transport?.reconnect(),
  }), [action, connectionState, online, runtime, state, transport, transportState]);
}
