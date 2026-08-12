export const PRESENTATION_DISPLAYS = Object.freeze([
  { id: "main-office", name: "Main Office", presentationProfile: "standard" },
  { id: "dispatch", name: "Dispatch", presentationProfile: "standard" },
  { id: "lobby", name: "Lobby", presentationProfile: "public" },
  { id: "warehouse", name: "Warehouse", presentationProfile: "standard" },
  { id: "training", name: "Training", presentationProfile: "training" },
]);

export const DEFAULT_DISPLAY_ID = PRESENTATION_DISPLAYS[0].id;

export function findDisplay(displayId) {
  return PRESENTATION_DISPLAYS.find(({ id }) => id === displayId) ?? null;
}
