import {
  formatDisplayUptime,
  formatHeartbeatAge,
  formatMemoryHealth,
  formatRecoveryReason,
} from "../../lib/displayRuntimeHealth";

const DISPLAY_ICONS = {
  monitor: "M4 5h16v11H4z M9 20h6 M12 16v4",
  slide: "M5 4h14v16H5z M8 8h8 M8 12h6",
  rotation: "M20 11a8 8 0 1 0-2.34 5.66 M20 4v7h-7",
  connected: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M22 21v-2a4 4 0 0 0-3-3.87",
  memory: "M7 2v3 M12 2v3 M17 2v3 M7 19v3 M12 19v3 M17 19v3 M2 7h3 M2 12h3 M2 17h3 M19 7h3 M19 12h3 M19 17h3 M5 5h14v14H5z",
  uptime: "M12 7v5l3 2 M12 22a10 10 0 1 0-10-10 10 10 0 0 0 10 10",
  heartbeat: "M3 12h4l2-5 4 10 2-5h6",
  reload: "M20 11a8 8 0 1 0-2.34 5.66 M20 4v7h-7",
  recovery: "M12 8v5l3 2 M21 12a9 9 0 1 1-3-6.7",
  previous: "M15 18l-6-6 6-6",
  next: "M9 18l6-6-6-6",
  pause: "M9 5v14 M15 5v14",
  resume: "M8 5l11 7-11 7z",
  customize: "M4 7h10 M18 7h2 M4 17h2 M10 17h10 M14 4v6 M6 14v6",
  chevron: "M6 9l6 6 6-6",
};

function DisplayIcon({ name }) {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d={DISPLAY_ICONS[name]} /></svg>;
}

function displayConnection(display) {
  if (!display) return { label: "Checking", tone: "checking" };
  const connected = display.displayOnline === true || (display.connectedClients?.displays || 0) > 0;
  return connected ? { label: "Connected", tone: "connected" } : { label: "Disconnected", tone: "disconnected" };
}

function MetricCard({ icon, label, value, children, className = "" }) {
  return <article className={`display-metric-card ${className}`.trim()}>
    <span className="display-metric-card__icon"><DisplayIcon name={icon} /></span>
    <span className="display-metric-card__label">{label}</span>
    <strong>{value}</strong>
    {children}
  </article>;
}

function DisplaySelector({ displays, selectedDisplayId, slides, onSelectDisplay }) {
  return <div className="display-picker display-picker--cards" aria-label="Choose a display">
    {displays.map((display) => {
      const connection = displayConnection(display);
      const presenceClass = connection.tone === "connected" ? "is-display-online" : connection.tone === "disconnected" ? "is-display-offline" : "is-display-error";
      const slide = display.currentSlide?.label || slides?.[display.activeSlideIndex]?.label || "Unknown slide";
      return <button
        type="button"
        key={display.displayId}
        onClick={() => onSelectDisplay(display.displayId)}
        className={`${display.displayId === selectedDisplayId ? "is-selected " : ""}${presenceClass}`.trim()}
        aria-pressed={display.displayId === selectedDisplayId}
      >
        <span className="display-dot" aria-label={`Display ${connection.label.toLowerCase()}`} />
        <span className="display-picker__copy">
          <strong>{display.displayName}</strong>
          <small>{slide}</small>
        </span>
      </button>;
    })}
  </div>;
}

export function DisplayControls({ controller, acknowledgement, onCustomize }) {
  const acknowledgementText = acknowledgement?.applied
    ? `Applied - r${acknowledgement.appliedRevision}`
    : acknowledgement?.targetRevision != null
      ? `Waiting - r${acknowledgement.appliedRevision ?? "—"}/${acknowledgement.targetRevision}`
      : "Waiting for first command";

  return <>
    <section className="display-control-section" aria-labelledby="display-controls-title">
      <div className="display-section-heading">
        <span className="mobile-eyebrow">Live controls</span>
        <h4 id="display-controls-title">Control this display</h4>
      </div>
      <div className="display-primary-controls" aria-label={`Controls for ${controller.displayName}`}>
        <button type="button" aria-label="Previous slide" onClick={controller.previousSlide}><DisplayIcon name="previous" /><span>Previous</span></button>
        <button type="button" aria-label="Next slide" onClick={controller.nextSlide}><DisplayIcon name="next" /><span>Next</span></button>
        <button type="button" aria-label="Pause rotation" onClick={controller.pauseRotation} disabled={!controller.isRunning}><DisplayIcon name="pause" /><span>Pause</span></button>
        <button type="button" aria-label="Resume rotation" onClick={controller.resumeRotation} disabled={controller.isRunning}><DisplayIcon name="resume" /><span>Resume</span></button>
      </div>
    </section>

    <details className="display-advanced-controls">
      <summary><span>Advanced Controls</span><DisplayIcon name="chevron" /></summary>
      <div className="display-advanced-controls__body">
        <button className="display-restart" type="button" onClick={controller.restartRotationTimer}><DisplayIcon name="reload" />Restart Rotation</button>
        <div className="operations-slide-buttons" aria-label="Jump to slide">
          {controller.slides.map((slide, index) => <button
            type="button"
            key={slide.id}
            className={controller.activeSlideIndex === index ? "is-active" : ""}
            aria-pressed={controller.activeSlideIndex === index}
            onClick={() => controller.selectSlide(index)}
          ><small>{index + 1}</small><span>{slide.label}</span></button>)}
        </div>
        <button className="display-customize-link" type="button" onClick={onCustomize}>
          <DisplayIcon name="customize" />
          <span><strong>Customize dashboard</strong><small>Metrics and data slides</small></span>
          <b aria-hidden="true">›</b>
        </button>
        <div className="display-command-detail">
          <span>Command acknowledgement</span>
          <strong>{acknowledgementText}</strong>
        </div>
      </div>
    </details>
  </>;
}

export function DisplaysTab({ admin, controller, selectedDisplayId, onSelectDisplay, onCustomize }) {
  const displays = admin?.displays || [];
  const selected = displays.find((item) => item.displayId === selectedDisplayId);
  const connection = displayConnection(selected);
  const health = selected?.runtimeHealth;
  const memoryPercent = Number.isFinite(health?.memoryPercent) ? Math.max(0, Math.min(100, health.memoryPercent)) : null;

  return <div className="displays-mobile displays-mobile-v2">
    <div className="settings-title displays-page-title"><span className="mobile-eyebrow">Live screens</span><h2>Displays</h2></div>
    <DisplaySelector displays={displays} selectedDisplayId={selectedDisplayId} slides={controller.slides} onSelectDisplay={onSelectDisplay} />

    <section className="display-detail-panel">
      <header className="display-hero">
        <div>
          <span className="mobile-eyebrow">Selected display</span>
          <h3>{controller.displayName}</h3>
          <span className={`display-connection-pill is-${connection.tone}`}><i />{connection.label}</span>
        </div>
        <span className="display-hero__icon"><DisplayIcon name="monitor" /></span>
      </header>

      <div className="display-status-grid" aria-label="Display status">
        <MetricCard icon="slide" label="Current Slide" value={controller.activeSlide?.label || "Unknown"} />
        <MetricCard icon="rotation" label="Rotation" value={controller.isRunning ? "Running" : "Paused"} />
        <MetricCard icon="connected" label="Connected" value={selected?.connectedClients?.total ?? "—"} />
      </div>

      <div className="display-runtime-grid" aria-label="Display runtime health">
        <MetricCard icon="memory" label="Memory Usage" value={formatMemoryHealth(health)} className={health?.memoryPressure ? "is-warning" : ""}>
          {memoryPercent != null && <span className="display-memory-track" role="progressbar" aria-label="Display memory usage" aria-valuemin="0" aria-valuemax="100" aria-valuenow={memoryPercent}><i style={{ width: `${memoryPercent}%` }} /></span>}
        </MetricCard>
        <MetricCard icon="uptime" label="Session Uptime" value={formatDisplayUptime(health?.uptimeSeconds)} />
        <MetricCard icon="heartbeat" label="Last Heartbeat" value={formatHeartbeatAge(health?.lastHeartbeatAt)} />
      </div>

      <div className="display-reload-row">
        <span className="display-metric-card__icon"><DisplayIcon name="reload" /></span>
        <span><small>Reloads</small><strong>{health?.relaunchCount ?? 0}</strong></span>
      </div>

      <div className="display-recovery-card">
        <span className="display-recovery-card__icon"><DisplayIcon name="recovery" /></span>
        <span><small>Last Recovery</small><strong>{formatRecoveryReason(health?.lastRelaunchReason)}</strong></span>
      </div>

      <DisplayControls controller={controller} acknowledgement={selected?.acknowledgement} onCustomize={onCustomize} />
    </section>
  </div>;
}
