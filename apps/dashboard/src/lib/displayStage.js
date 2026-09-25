export const DISPLAY_STAGE_WIDTH = 1920;
export const DISPLAY_STAGE_HEIGHT = 1080;

export function calculateDisplayStage(viewportWidth, viewportHeight) {
  const width = Number.isFinite(viewportWidth) && viewportWidth > 0 ? viewportWidth : DISPLAY_STAGE_WIDTH;
  const height = Number.isFinite(viewportHeight) && viewportHeight > 0 ? viewportHeight : DISPLAY_STAGE_HEIGHT;
  const scale = Math.min(width / DISPLAY_STAGE_WIDTH, height / DISPLAY_STAGE_HEIGHT);
  const renderedWidth = DISPLAY_STAGE_WIDTH * scale;
  const renderedHeight = DISPLAY_STAGE_HEIGHT * scale;
  return Object.freeze({
    logicalWidth: DISPLAY_STAGE_WIDTH,
    logicalHeight: DISPLAY_STAGE_HEIGHT,
    viewportWidth: width,
    viewportHeight: height,
    scale,
    renderedWidth,
    renderedHeight,
    offsetX: (width - renderedWidth) / 2,
    offsetY: (height - renderedHeight) / 2,
  });
}

export function collectDisplayStageDiagnostics({ windowRef, documentRef, viewportElement } = {}) {
  const visualViewport = windowRef?.visualViewport;
  const viewportRect = viewportElement?.getBoundingClientRect?.();
  const viewportWidth = viewportRect?.width || visualViewport?.width || windowRef?.innerWidth;
  const viewportHeight = viewportRect?.height || visualViewport?.height || windowRef?.innerHeight;
  const layout = calculateDisplayStage(viewportWidth, viewportHeight);
  return Object.freeze({
    windowInnerWidth: windowRef?.innerWidth ?? null,
    windowInnerHeight: windowRef?.innerHeight ?? null,
    documentClientWidth: documentRef?.documentElement?.clientWidth ?? null,
    documentClientHeight: documentRef?.documentElement?.clientHeight ?? null,
    screenWidth: windowRef?.screen?.width ?? null,
    screenHeight: windowRef?.screen?.height ?? null,
    devicePixelRatio: windowRef?.devicePixelRatio ?? null,
    visualViewportWidth: visualViewport?.width ?? null,
    visualViewportHeight: visualViewport?.height ?? null,
    visualViewportScale: visualViewport?.scale ?? null,
    displayStageScale: layout.scale,
    renderedWidth: layout.renderedWidth,
    renderedHeight: layout.renderedHeight,
    userAgent: windowRef?.navigator?.userAgent || "Unavailable",
    layout,
  });
}
