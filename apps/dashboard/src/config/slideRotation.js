export const SLIDE_ROTATION_INTERVAL_MS = 15_000;
export const SLIDE_TRANSITION_DURATION_MS = 400;

export function nextSlideIndex(currentIndex, slideCount) {
  return slideCount > 0 ? (currentIndex + 1) % slideCount : 0;
}
