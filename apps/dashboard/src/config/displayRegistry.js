import presentationConfig from "../../../../shared/presentation.json" with { type: "json" };

export const PRESENTATION_DISPLAYS = Object.freeze(presentationConfig.displays);

function requestedDisplayId() {
  if (typeof window === "undefined") return null;
  const requested = new URLSearchParams(window.location.search).get("display");
  return PRESENTATION_DISPLAYS.some(({ id }) => id === requested) ? requested : null;
}

// The launcher includes ?display=<id> on both the physical dashboard and its QR remote.
// This makes the remote start paired to the exact screen that was launched instead of
// silently defaulting to the first registry entry (which made it look detached).
export const DEFAULT_DISPLAY_ID = requestedDisplayId() || PRESENTATION_DISPLAYS[0].id;

export function findDisplay(displayId) {
  return PRESENTATION_DISPLAYS.find(({ id }) => id === displayId) ?? null;
}
