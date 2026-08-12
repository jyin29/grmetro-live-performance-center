import { createContext, useCallback, useContext, useMemo, useSyncExternalStore } from "react";
import { DEFAULT_DISPLAY_ID, findDisplay, PRESENTATION_DISPLAYS } from "../config/displayRegistry";
import { PRESENTATION_SLIDES } from "../config/slideRegistry";
import { SLIDE_ROTATION_INTERVAL_MS } from "../config/slideRotation";
import { createDisplayManager } from "./displayManager";
import { createPresentationCommand, createPresentationCommandBus, PRESENTATION_COMMANDS } from "./presentationCommands";

const slideCount = PRESENTATION_SLIDES.length;
const manager = createDisplayManager({ displays: PRESENTATION_DISPLAYS, slideCount, rotationIntervalMs: SLIDE_ROTATION_INTERVAL_MS });
export const presentationCommandBus = createPresentationCommandBus({ handleCommand: manager.handleCommand });
const PresentationControllerContext = createContext(null);

export function PresentationControllerProvider({ children }) {
  return <PresentationControllerContext.Provider value={{ manager, commandBus: presentationCommandBus }}>{children}</PresentationControllerContext.Provider>;
}

export function usePresentationController(requestedDisplayId = DEFAULT_DISPLAY_ID) {
  const context = useContext(PresentationControllerContext);
  if (!context) throw new Error("usePresentationController must be used within PresentationControllerProvider");
  const displayId = findDisplay(requestedDisplayId)?.id ?? DEFAULT_DISPLAY_ID;
  const state = useSyncExternalStore(context.manager.subscribe, () => context.manager.getDisplayState(displayId));
  const send = useCallback((type, payload) => context.commandBus.dispatch(createPresentationCommand(type, displayId, payload)), [context.commandBus, displayId]);
  const setRuntimePaused = useCallback((paused) => context.manager.setRuntimePaused(displayId, paused), [context.manager, displayId]);
  return useMemo(() => ({
    ...state,
    activeSlide: PRESENTATION_SLIDES[state.activeSlideIndex],
    displays: PRESENTATION_DISPLAYS,
    slides: PRESENTATION_SLIDES,
    nextSlide: () => send(PRESENTATION_COMMANDS.NEXT_SLIDE),
    pauseRotation: () => send(PRESENTATION_COMMANDS.PAUSE_ROTATION),
    previousSlide: () => send(PRESENTATION_COMMANDS.PREVIOUS_SLIDE),
    restartRotationTimer: () => send(PRESENTATION_COMMANDS.RESTART_ROTATION_TIMER),
    resumeRotation: () => send(PRESENTATION_COMMANDS.RESUME_ROTATION),
    selectSlide: (index) => send(PRESENTATION_COMMANDS.GO_TO_SLIDE, { index }),
    setRuntimePaused,
  }), [send, setRuntimePaused, state]);
}
