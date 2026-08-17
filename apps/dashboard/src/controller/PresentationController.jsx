import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { DEFAULT_DISPLAY_ID, findDisplay, PRESENTATION_DISPLAYS } from "../config/displayRegistry";
import { PRESENTATION_SLIDES } from "../config/slideRegistry";
import { createPresentationCommand, PRESENTATION_COMMANDS } from "./presentationCommands";
import { createWebSocketPresentationTransport } from "./presentationTransport";
import { RUNTIME_SETTINGS } from "../config/runtimeSettings";

const PresentationControllerContext = createContext(null);
const slideCount = PRESENTATION_SLIDES.length;

function slideStorageKey(displayId) {
  return `grmetro.presentation.${displayId}.slideIndex`;
}

function rememberedSlideIndex(displayId) {
  try {
    const value = Number(window.sessionStorage.getItem(slideStorageKey(displayId)));
    return Number.isInteger(value) && value >= 0 && value < slideCount ? value : 0;
  } catch {
    return 0;
  }
}

function rememberSlideIndex(displayId, index) {
  if (!Number.isInteger(index) || index < 0) return;
  try { window.sessionStorage.setItem(slideStorageKey(displayId), String(index % slideCount)); } catch { /* storage is optional */ }
}

export function PresentationControllerProvider({ children }) {
  return <PresentationControllerContext.Provider value={true}>{children}</PresentationControllerContext.Provider>;
}

export function usePresentationController(requestedDisplayId = DEFAULT_DISPLAY_ID, clientType = "display") {
  if (!useContext(PresentationControllerContext)) throw new Error("usePresentationController must be used within PresentationControllerProvider");
  const displayId = findDisplay(requestedDisplayId)?.id ?? DEFAULT_DISPLAY_ID;
  const display = findDisplay(displayId);
  const [state, setState] = useState(() => ({ displayId, displayName: display.name, presentationProfile: display.presentationProfile,
    activeSlideIndex: rememberedSlideIndex(displayId), isRunning: true, timerRevision: 0, lastUpdated: null }));
  const [connectionState, setConnectionState] = useState("connecting");
  const [transport, setTransport] = useState(null);
  const [runtime, setRuntime] = useState({ reconnectCount: 0, lastSynchronization: null });

  useEffect(() => {
    setState((current) => ({ ...current, displayId, displayName: display.name, presentationProfile: display.presentationProfile,
      activeSlideIndex: current.displayId === displayId ? current.activeSlideIndex : rememberedSlideIndex(displayId) }));
    const nextTransport = createWebSocketPresentationTransport({ displayId, clientType,
      reconnectMinimumMs: RUNTIME_SETTINGS.reconnectMinimumMs, reconnectMaximumMs: RUNTIME_SETTINGS.reconnectMaximumMs,
      onState: (nextState) => {
        rememberSlideIndex(displayId, nextState.activeSlideIndex);
        setState(nextState);
        setRuntime((current) => ({ ...current, lastSynchronization: Date.now() }));
      },
      onConnectionChange: setConnectionState,
      onReconnectAttempt: () => setRuntime((current) => ({ ...current, reconnectCount: current.reconnectCount + 1 })),
    });
    setTransport(nextTransport);
    return () => nextTransport.close();
  }, [clientType, display.name, display.presentationProfile, displayId]);

  useEffect(() => { rememberSlideIndex(displayId, state.activeSlideIndex); }, [displayId, state.activeSlideIndex]);

  const send = useCallback((type, payload) => transport?.send(createPresentationCommand(type, displayId, payload)), [displayId, transport]);
  return useMemo(() => ({
    ...state, ...runtime, connectionState, activeSlide: PRESENTATION_SLIDES[state.activeSlideIndex % slideCount], displays: PRESENTATION_DISPLAYS, slides: PRESENTATION_SLIDES,
    nextSlide: () => send(PRESENTATION_COMMANDS.NEXT_SLIDE), pauseRotation: () => send(PRESENTATION_COMMANDS.PAUSE_ROTATION),
    previousSlide: () => send(PRESENTATION_COMMANDS.PREVIOUS_SLIDE), restartRotationTimer: () => send(PRESENTATION_COMMANDS.RESTART_ROTATION_TIMER),
    resumeRotation: () => send(PRESENTATION_COMMANDS.RESUME_ROTATION), selectSlide: (index) => send(PRESENTATION_COMMANDS.GO_TO_SLIDE, { index }),
    setRuntimePaused: () => {},
    reconnect: () => transport?.reconnect(),
  }), [connectionState, runtime, send, state, transport]);
}
