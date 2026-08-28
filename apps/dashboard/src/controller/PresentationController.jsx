import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { DEFAULT_DISPLAY_ID, findDisplay, PRESENTATION_DISPLAYS } from "../config/displayRegistry";
import { PRESENTATION_SLIDES } from "../config/slideRegistry";
import { createWebSocketPresentationTransport } from "./presentationTransport";
import { RUNTIME_SETTINGS } from "../config/runtimeSettings";

const PresentationControllerContext = createContext(null);
const slideCount = PRESENTATION_SLIDES.length;
const POLL_MS = 500;
const DISPLAY_HEARTBEAT_MS = 2000;

async function requestJson(path, options = {}) {
  const response = await fetch(path, { cache: "no-store", ...options });
  if (!response.ok) throw new Error(`presentation request failed (${response.status})`);
  return response.json();
}

export function PresentationControllerProvider({ children }) {
  return <PresentationControllerContext.Provider value={true}>{children}</PresentationControllerContext.Provider>;
}

export function usePresentationController(requestedDisplayId = DEFAULT_DISPLAY_ID, clientType = "display") {
  if (!useContext(PresentationControllerContext)) throw new Error("usePresentationController must be used within PresentationControllerProvider");
  const displayId = findDisplay(requestedDisplayId)?.id ?? DEFAULT_DISPLAY_ID;
  const display = findDisplay(displayId);
  const [state, setState] = useState({ displayId, displayName: display.name, presentationProfile: display.presentationProfile, activeSlideIndex: 0, isRunning: true, timerRevision: 0, lastUpdated: null });
  const [transportState, setTransportState] = useState("connecting");
  const [online, setOnline] = useState(clientType === "display");
  const [runtime, setRuntime] = useState({ reconnectCount: 0, lastSynchronization: null, lastCommandError: null, lastCommandAt: null });
  const [transport, setTransport] = useState(null);

  const acceptState = useCallback((next) => {
    if (!next || next.displayId !== displayId) return;
    setState(next);
    setRuntime((current) => ({ ...current, lastSynchronization: Date.now() }));
  }, [displayId]);

  useEffect(() => {
    let ws;
    try {
      ws = createWebSocketPresentationTransport({
        displayId, clientType, location: window.location,
        reconnectMinimumMs: RUNTIME_SETTINGS.reconnectMinimumMs,
        reconnectMaximumMs: RUNTIME_SETTINGS.reconnectMaximumMs,
        onState: acceptState,
        onConnectionChange: setTransportState,
        onReconnectAttempt: () => setRuntime((current) => ({ ...current, reconnectCount: current.reconnectCount + 1 })),
      });
      setTransport(ws);
    } catch { setTransportState("reconnecting"); }
    return () => ws?.close();
  }, [acceptState, clientType, displayId]);

  useEffect(() => {
    let active = true;
    let failures = 0;
    const poll = async () => {
      try {
        const payload = await requestJson(`/api/v1/presentation/${encodeURIComponent(displayId)}`);
        if (!active) return;
        failures = 0;
        acceptState(payload.state);
        if (clientType === "remote") setOnline(payload.online === true);
      } catch {
        if (!active || clientType !== "remote") return;
        failures += 1;
        // A single missed LAN poll while changing tabs must not turn a healthy display
        // offline. Presence is backend-authoritative; only degrade after several misses.
        if (failures >= 6) setOnline(false);
      }
    };
    poll();
    const timer = window.setInterval(poll, POLL_MS);
    return () => { active = false; window.clearInterval(timer); };
  }, [acceptState, clientType, displayId]);

  useEffect(() => {
    if (clientType !== "display") return undefined;
    let active = true;
    const beat = async () => {
      try {
        await requestJson(`/api/v1/presentation/${encodeURIComponent(displayId)}/heartbeat`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
        if (active) setOnline(true);
      } catch { if (active) setOnline(false); }
    };
    beat();
    const timer = window.setInterval(beat, DISPLAY_HEARTBEAT_MS);
    return () => { active = false; window.clearInterval(timer); };
  }, [clientType, displayId]);

  const action = useCallback(async (name, payload = {}) => {
    try {
      const query = name === "select" ? `?index=${encodeURIComponent(payload.index)}` : "";
      const result = await requestJson(`/api/v1/presentation/${encodeURIComponent(displayId)}/action/${name}${query}`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      acceptState(result.state);
      if (clientType === "remote" && typeof result.online === "boolean") setOnline(result.online);
      setRuntime((current) => ({ ...current, lastCommandAt: Date.now(), lastCommandError: null }));
      return result;
    } catch (error) {
      setRuntime((current) => ({ ...current, lastCommandAt: Date.now(), lastCommandError: error.message }));
      console.error("Presentation action failed", { displayId, clientType, name, error });
      return null;
    }
  }, [acceptState, clientType, displayId]);

  const connectionState = clientType === "remote" ? (online ? "connected" : "offline") : (online || transportState === "connected" ? "connected" : "reconnecting");
  return useMemo(() => ({
    ...state, ...runtime, connectionState, targetDisplayOnline: online,
    activeSlide: PRESENTATION_SLIDES[state.activeSlideIndex % slideCount], displays: PRESENTATION_DISPLAYS, slides: PRESENTATION_SLIDES,
    nextSlide: () => action("next"), previousSlide: () => action("previous"), pauseRotation: () => action("pause"), resumeRotation: () => action("resume"), restartRotationTimer: () => action("restart"), selectSlide: (index) => action("select", { index }),
    setRuntimePaused: () => {}, reconnect: () => transport?.reconnect(),
  }), [action, connectionState, online, runtime, state, transport]);
}
