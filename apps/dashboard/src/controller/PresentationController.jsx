import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useState } from "react";
import { PRESENTATION_SLIDES } from "../config/slideRegistry";
import { SLIDE_ROTATION_INTERVAL_MS } from "../config/slideRotation";
import { createPresentationState, PRESENTATION_ACTIONS, presentationControllerReducer } from "./presentationControllerState";

const PresentationControllerContext = createContext(null);

export function PresentationControllerProvider({ children }) {
  const slideCount = PRESENTATION_SLIDES.length;
  const [state, dispatch] = useReducer(presentationControllerReducer, slideCount, createPresentationState);
  const [runtimePaused, setRuntimePaused] = useState(false);
  const send = useCallback((type, detail = {}) => dispatch({ type, slideCount, ...detail }), [slideCount]);

  useEffect(() => {
    if (!state.isRunning || runtimePaused || slideCount < 2) return undefined;
    const interval = window.setInterval(() => send(PRESENTATION_ACTIONS.NEXT), SLIDE_ROTATION_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [runtimePaused, send, slideCount, state.isRunning]);

  const value = useMemo(() => ({
    activeSlideIndex: state.activeSlideIndex,
    activeSlide: PRESENTATION_SLIDES[state.activeSlideIndex],
    isRunning: state.isRunning,
    slides: PRESENTATION_SLIDES,
    nextSlide: () => send(PRESENTATION_ACTIONS.NEXT),
    pauseRotation: () => send(PRESENTATION_ACTIONS.PAUSE),
    previousSlide: () => send(PRESENTATION_ACTIONS.PREVIOUS),
    resumeRotation: () => send(PRESENTATION_ACTIONS.RESUME),
    selectSlide: (index) => send(PRESENTATION_ACTIONS.SELECT, { index }),
    setRuntimePaused,
  }), [send, state.activeSlideIndex, state.isRunning]);

  return <PresentationControllerContext.Provider value={value}>{children}</PresentationControllerContext.Provider>;
}

export function usePresentationController() {
  const controller = useContext(PresentationControllerContext);
  if (!controller) throw new Error("usePresentationController must be used within PresentationControllerProvider");
  return controller;
}
