import { useLayoutEffect, useRef, useState } from "react";
import { calculateDisplayStage, collectDisplayStageDiagnostics, DISPLAY_STAGE_HEIGHT, DISPLAY_STAGE_WIDTH } from "../lib/displayStage";

function value(value, digits = 2) {
  if (!Number.isFinite(value)) return "unavailable";
  return Number.isInteger(value) ? String(value) : value.toFixed(digits);
}

function diagnosticText(diagnostics) {
  return [
    "TEMP DISPLAY DIAGNOSTICS",
    `window.innerWidth: ${value(diagnostics.windowInnerWidth)}`,
    `window.innerHeight: ${value(diagnostics.windowInnerHeight)}`,
    `document.documentElement.clientWidth: ${value(diagnostics.documentClientWidth)}`,
    `document.documentElement.clientHeight: ${value(diagnostics.documentClientHeight)}`,
    `screen.width: ${value(diagnostics.screenWidth)}`,
    `screen.height: ${value(diagnostics.screenHeight)}`,
    `window.devicePixelRatio: ${value(diagnostics.devicePixelRatio, 4)}`,
    `visualViewport.width: ${value(diagnostics.visualViewportWidth)}`,
    `visualViewport.height: ${value(diagnostics.visualViewportHeight)}`,
    `visualViewport.scale: ${value(diagnostics.visualViewportScale, 4)}`,
    `DisplayStage scale: ${value(diagnostics.displayStageScale, 6)}`,
    `rendered width: ${value(diagnostics.renderedWidth)}`,
    `rendered height: ${value(diagnostics.renderedHeight)}`,
    `userAgent: ${diagnostics.userAgent}`,
  ].join("\n");
}

export function DisplayStage({ children, diagnosticsVisible = false }) {
  const viewportRef = useRef(null);
  const [layout, setLayout] = useState(() => calculateDisplayStage(
    typeof window === "undefined" ? DISPLAY_STAGE_WIDTH : window.innerWidth,
    typeof window === "undefined" ? DISPLAY_STAGE_HEIGHT : window.innerHeight,
  ));
  const [diagnostics, setDiagnostics] = useState(() => collectDisplayStageDiagnostics({
    windowRef: typeof window === "undefined" ? null : window,
    documentRef: typeof document === "undefined" ? null : document,
  }));
  const lastLoggedRef = useRef("");

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    document.body.classList.add("display-stage-active");
    const update = () => {
      const next = collectDisplayStageDiagnostics({ windowRef: window, documentRef: document, viewportElement: viewport });
      setLayout(next.layout);
      setDiagnostics(next);
      const consoleValues = {
        "window.innerWidth": next.windowInnerWidth,
        "window.innerHeight": next.windowInnerHeight,
        "document.documentElement.clientWidth": next.documentClientWidth,
        "document.documentElement.clientHeight": next.documentClientHeight,
        "screen.width": next.screenWidth,
        "screen.height": next.screenHeight,
        "window.devicePixelRatio": next.devicePixelRatio,
        "visualViewport.width": next.visualViewportWidth,
        "visualViewport.height": next.visualViewportHeight,
        "visualViewport.scale": next.visualViewportScale,
        "DisplayStage.scale": next.displayStageScale,
        "DisplayStage.renderedWidth": next.renderedWidth,
        "DisplayStage.renderedHeight": next.renderedHeight,
        userAgent: next.userAgent,
      };
      const serialized = JSON.stringify(consoleValues);
      if (lastLoggedRef.current !== serialized) {
        lastLoggedRef.current = serialized;
        console.info("[GRMetro DisplayStage diagnostics]", consoleValues);
      }
    };
    const observer = typeof ResizeObserver === "function" ? new ResizeObserver(update) : null;
    observer?.observe(viewport);
    window.addEventListener("resize", update);
    window.visualViewport?.addEventListener("resize", update);
    update();
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", update);
      window.visualViewport?.removeEventListener("resize", update);
      document.body.classList.remove("display-stage-active");
    };
  }, []);

  return <div className="display-viewport" ref={viewportRef} data-display-stage-scale={layout.scale}>
    <div
      className="display-stage"
      style={{ "--display-stage-scale": layout.scale, width: DISPLAY_STAGE_WIDTH, height: DISPLAY_STAGE_HEIGHT }}
    >{children}</div>
    {diagnosticsVisible && <pre className="display-stage-diagnostics" aria-label="Temporary display viewport diagnostics">{diagnosticText(diagnostics)}</pre>}
  </div>;
}
