export function createDiagnosticsState({ displayId, presentationProfile, startedAt, now, connectionState,
  reconnectCount, lastSuccessfulRefresh, hasError, buildVersion, visible }) {
  return Object.freeze({ visible, displayId, presentationProfile, uptimeMs: Math.max(0, now - startedAt),
    websocketStatus: connectionState, reconnectCount, backendConnected: Boolean(lastSuccessfulRefresh) && !hasError,
    buildVersion: buildVersion || null });
}
