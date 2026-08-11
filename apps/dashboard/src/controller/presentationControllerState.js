export const PRESENTATION_ACTIONS = Object.freeze({
  NEXT: "presentation/next",
  PAUSE: "presentation/pause",
  PREVIOUS: "presentation/previous",
  RESUME: "presentation/resume",
  SELECT: "presentation/select",
});

export function normalizeSlideIndex(index, slideCount) {
  if (!Number.isInteger(slideCount) || slideCount <= 0) return 0;
  const numericIndex = Number.isFinite(Number(index)) ? Math.trunc(Number(index)) : 0;
  return ((numericIndex % slideCount) + slideCount) % slideCount;
}

export function createPresentationState(slideCount) {
  return { activeSlideIndex: normalizeSlideIndex(0, slideCount), isRunning: true };
}

export function presentationControllerReducer(state, action) {
  const slideCount = action.slideCount;
  switch (action.type) {
    case PRESENTATION_ACTIONS.NEXT:
      return { ...state, activeSlideIndex: normalizeSlideIndex(state.activeSlideIndex + 1, slideCount) };
    case PRESENTATION_ACTIONS.PREVIOUS:
      return { ...state, activeSlideIndex: normalizeSlideIndex(state.activeSlideIndex - 1, slideCount) };
    case PRESENTATION_ACTIONS.SELECT:
      return { ...state, activeSlideIndex: normalizeSlideIndex(action.index, slideCount) };
    case PRESENTATION_ACTIONS.PAUSE:
      return { ...state, isRunning: false };
    case PRESENTATION_ACTIONS.RESUME:
      return { ...state, isRunning: true };
    default:
      return state;
  }
}
