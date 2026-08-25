import { usePresentationController } from "../controller/PresentationController";
import { Header } from "./Header";
import { ManagementAttention } from "./ManagementAttention";
import { SlideDeck } from "./SlideDeck";
import { managementInsights } from "../lib/presentation";
import { EventOverlay } from "./EventOverlay";
import { DiagnosticsOverlay } from "./DiagnosticsOverlay";
import { LocalDashboardControls } from "./LocalDashboardControls";
import { RUNTIME_SETTINGS } from "../config/runtimeSettings";
import { createDisplayWatchdog } from "../runtime/displayWatchdog";
import { isFullscreenShortcut, requestDisplayFullscreen, toggleDisplayFullscreen } from "../runtime/fullscreen";
import { useEffect, useMemo, useRef, useState } from "react";
import { attachWakeRecovery } from "../runtime/wakeRecovery";
import { createDiagnosticsState } from "../runtime/diagnostics";
import { useSpreadsheetSlide } from "../hooks/useSpreadsheetSlide";

export function DashboardLayout({ data, displayId, displaySettings, error, refreshing, retry, lastSuccessfulRefresh }) {
  const presentation = usePresentationController(displayId);
  // Dashboard-local controls must connect as a remote/controller client. The backend intentionally
  // keeps the display socket read-only so a compromised display connection cannot issue commands.
  const localControls = usePresentationController(displayId, "remote");
  const spreadsheetSlide = useSpreadsheetSlide();
  const rotationPaused = !presentation.isRunning || refreshing || Boolean(error);
  const startedAt = useRef(Date.now());
  const recoveryRef = useRef({ presentation, retry });
  const [diagnosticsVisible, setDiagnosticsVisible] = useState(RUNTIME_SETTINGS.diagnosticsVisible);
  const [clock, setClock] = useState(Date.now());
  recoveryRef.current = { presentation, retry };

  const watchdog = useMemo(() => createDisplayWatchdog({ intervalMs: RUNTIME_SETTINGS.watchdogIntervalMs, presentationStaleMs: RUNTIME_SETTINGS.presentationStaleMs,
    dashboardStaleMs: RUNTIME_SETTINGS.dashboardStaleMs, onRecover: ({ disconnected, presentationStale, dashboardStale }) => { if (disconnected || presentationStale) recoveryRef.current.presentation.reconnect(); if (dashboardStale) recoveryRef.current.retry({ background: true }); } }), []);
  useEffect(() => { watchdog.start(); return () => watchdog.stop(); }, [watchdog]);
  useEffect(() => { watchdog.update({ connected: presentation.connectionState === "connected", lastSynchronization: presentation.lastSynchronization, lastDashboardRefresh: lastSuccessfulRefresh }); }, [lastSuccessfulRefresh, presentation.connectionState, presentation.lastSynchronization, watchdog]);
  useEffect(() => attachWakeRecovery({ recover: () => watchdog.wake("browser-wake") }), [watchdog]);
  useEffect(() => {
    let cursorTimer; const showCursor = () => { document.body.classList.remove("cursor-hidden"); window.clearTimeout(cursorTimer); cursorTimer = window.setTimeout(() => document.body.classList.add("cursor-hidden"), RUNTIME_SETTINGS.cursorIdleMs); };
    const preventDrag = (event) => event.preventDefault(); const onKeyDown = (event) => { if (isFullscreenShortcut(event)) { event.preventDefault(); toggleDisplayFullscreen(); } if (event.shiftKey && event.key.toLowerCase() === "d") setDiagnosticsVisible((visible) => !visible); };
    window.addEventListener("pointermove", showCursor, { passive: true }); window.addEventListener("keydown", onKeyDown); document.addEventListener("dragstart", preventDrag); showCursor(); if (RUNTIME_SETTINGS.kioskMode) requestDisplayFullscreen();
    return () => { window.clearTimeout(cursorTimer); document.body.classList.remove("cursor-hidden"); window.removeEventListener("pointermove", showCursor); window.removeEventListener("keydown", onKeyDown); document.removeEventListener("dragstart", preventDrag); };
  }, []);
  useEffect(() => { if (!diagnosticsVisible) return undefined; const timer = window.setInterval(() => setClock(Date.now()), 1_000); return () => window.clearInterval(timer); }, [diagnosticsVisible]);
  const diagnostics = createDiagnosticsState({ visible: diagnosticsVisible, displayId, presentationProfile: presentation.presentationProfile, startedAt: startedAt.current, now: clock,
    connectionState: presentation.connectionState, reconnectCount: presentation.reconnectCount, lastSuccessfulRefresh, hasError: Boolean(error), buildVersion: RUNTIME_SETTINGS.buildVersion });

  return <div className="app-shell">
    <Header refreshedAt={data.refreshedAt} refreshing={refreshing} hasError={Boolean(error)} />
    <ManagementAttention insights={managementInsights(data, { hasError: Boolean(error), refreshing })} />
    <SlideDeck data={data} spreadsheetSlide={spreadsheetSlide} displaySettings={displaySettings} slideIndex={presentation.activeSlideIndex} onSelectSlide={localControls.selectSlide} presentationState={{ hasError: Boolean(error), refreshing, rotationPaused }} />
    <EventOverlay event={presentation.event} />
    <DiagnosticsOverlay diagnostics={diagnostics} />
    <LocalDashboardControls controller={localControls} />
    <footer className="footer"><span><i className="live-dot" />Live ServiceTitan data</span><span>{presentation.connectionState === "connected" ? "Display connected · Live updates enabled" : "Display reconnecting · Updates will resume automatically"}</span><time>{new Date(data.generatedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</time></footer>
  </div>;
}
