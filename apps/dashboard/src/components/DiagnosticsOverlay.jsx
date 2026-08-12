import { memo } from "react";

function formatUptime(milliseconds) {
  const seconds = Math.max(0, Math.floor(milliseconds / 1000));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${minutes}m ${seconds % 60}s`;
}

export const DiagnosticsOverlay = memo(function DiagnosticsOverlay({ diagnostics }) {
  if (!diagnostics.visible) return null;
  return <aside className="diagnostics-overlay" aria-label="Display diagnostics">
    <strong>Display diagnostics</strong>
    <dl>
      <div><dt>Display ID</dt><dd>{diagnostics.displayId}</dd></div>
      <div><dt>Profile</dt><dd>{diagnostics.presentationProfile}</dd></div>
      <div><dt>Uptime</dt><dd>{formatUptime(diagnostics.uptimeMs)}</dd></div>
      <div><dt>WebSocket</dt><dd>{diagnostics.websocketStatus}</dd></div>
      <div><dt>Reconnects</dt><dd>{diagnostics.reconnectCount}</dd></div>
      <div><dt>Backend</dt><dd>{diagnostics.backendConnected ? "available" : "unavailable"}</dd></div>
      <div><dt>Build</dt><dd>{diagnostics.buildVersion || "not provided"}</dd></div>
    </dl>
  </aside>;
});
