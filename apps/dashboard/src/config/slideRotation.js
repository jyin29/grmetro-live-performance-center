export const SLIDE_ROTATION_INTERVAL_MS = 30_000;
export const SLIDE_TRANSITION_DURATION_MS = 400;
export const PRESENTATION_SLIDES = Object.freeze([
  { id: "revenue-overview", label: "Revenue overview" },
  { id: "technician-performance", label: "Technician performance" },
  { id: "business-performance", label: "Business performance" },
  { id: "recognition", label: "Recognition and achievements" },
  { id: "operations-health", label: "Operations health" },
]);

export function nextSlideIndex(currentIndex, slideCount) {
  return slideCount > 0 ? (currentIndex + 1) % slideCount : 0;
}
