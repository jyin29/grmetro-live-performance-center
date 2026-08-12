import presentationConfig from "../../../../shared/presentation.json" with { type: "json" };

export const PRESENTATION_DISPLAYS = Object.freeze(presentationConfig.displays);

export const DEFAULT_DISPLAY_ID = PRESENTATION_DISPLAYS[0].id;

export function findDisplay(displayId) {
  return PRESENTATION_DISPLAYS.find(({ id }) => id === displayId) ?? null;
}
