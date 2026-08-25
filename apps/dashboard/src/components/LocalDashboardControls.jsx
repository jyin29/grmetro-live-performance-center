import { useEffect, useRef, useState } from "react";

function isTypingTarget(target) {
  const tagName = target?.tagName?.toLowerCase();
  return tagName === "input" || tagName === "textarea" || tagName === "select" || target?.isContentEditable;
}

export function LocalDashboardControls({ controller }) {
  const [open, setOpen] = useState(false);
  const trayRef = useRef(null);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (isTypingTarget(event.target)) return;
      if (event.key.toLowerCase() === "c") {
        event.preventDefault();
        setOpen((value) => !value);
      }
      if (!open) return;
      if (event.key === "Escape") setOpen(false);
      if (event.key === "ArrowLeft") controller.previousSlide();
      if (event.key === "ArrowRight") controller.nextSlide();
      if (event.key === " ") {
        event.preventDefault();
        controller.isRunning ? controller.pauseRotation() : controller.resumeRotation();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [controller, open]);

  useEffect(() => {
    if (!open) return undefined;
    const closeOnOutsidePointer = (event) => {
      if (!trayRef.current?.contains(event.target)) setOpen(false);
    };
    window.addEventListener("pointerdown", closeOnOutsidePointer);
    return () => window.removeEventListener("pointerdown", closeOnOutsidePointer);
  }, [open]);

  if (!open) {
    return <button className="local-dashboard-controls__launcher" type="button" onClick={() => setOpen(true)} aria-label="Open dashboard controls" title="Dashboard controls (C)">
      <span aria-hidden="true">•••</span><span>Controls</span>
    </button>;
  }

  return <aside className="local-dashboard-controls" ref={trayRef} aria-label="Dashboard controls">
    <div className="local-dashboard-controls__topline">
      <div><small>{controller.displayName}</small><strong>{controller.activeSlide?.label || "Dashboard"}</strong></div>
      <span className={`local-dashboard-controls__status ${controller.connectionState === "connected" ? "is-connected" : ""}`}>{controller.connectionState}</span>
      <button className="local-dashboard-controls__close" type="button" onClick={() => setOpen(false)} aria-label="Close dashboard controls">×</button>
    </div>

    <div className="local-dashboard-controls__primary">
      <button type="button" onClick={controller.previousSlide}><span aria-hidden="true">←</span><small>Previous</small></button>
      <button className="is-primary" type="button" onClick={controller.isRunning ? controller.pauseRotation : controller.resumeRotation}>
        <span aria-hidden="true">{controller.isRunning ? "Ⅱ" : "▶"}</span><small>{controller.isRunning ? "Pause" : "Resume"}</small>
      </button>
      <button type="button" onClick={controller.nextSlide}><span aria-hidden="true">→</span><small>Next</small></button>
    </div>

    <div className="local-dashboard-controls__slides" aria-label="Choose slide">
      {controller.slides.map((slide, index) => <button type="button" key={slide.id} className={controller.activeSlideIndex === index ? "is-active" : ""} aria-pressed={controller.activeSlideIndex === index} onClick={() => controller.selectSlide(index)}>{slide.label}</button>)}
    </div>

    <div className="local-dashboard-controls__utility">
      <button type="button" onClick={controller.restartRotationTimer}>Restart timer</button>
      <a href="/remote">Open full controls</a>
    </div>
    <p className="local-dashboard-controls__hint">Keyboard: C controls · ←/→ slides · Space pause</p>
  </aside>;
}
