import logoUrl from "../../../../assets/branding/grmetro-logo.png";
import { useEffect, useState } from "react";
import { DEFAULT_DISPLAY_ID } from "../config/displayRegistry";
import { usePresentationController } from "../controller/PresentationController";
import { fetchRefreshStatus, requestDashboardRefresh } from "../api/managementApi";

export function RemoteControlPage() {
  const [selectedDisplayId, setSelectedDisplayId] = useState(DEFAULT_DISPLAY_ID);
  const controller = usePresentationController(selectedDisplayId, "remote");
  const [refreshStatus, setRefreshStatus] = useState({ state: "idle", message: "Ready to refresh" });
  useEffect(() => { fetchRefreshStatus().then(setRefreshStatus).catch(() => {}); }, []);
  async function refreshDashboard() {
    setRefreshStatus({ state: "refreshing", message: "Refreshing dashboard data…" });
    try { setRefreshStatus(await requestDashboardRefresh()); }
    catch (error) { setRefreshStatus({ state: "failed", message: error.message }); }
  }
  return <main className="remote-page">
    <header className="remote-header">
      <img src={logoUrl} alt="GRmetro Heating & Cooling" />
      <div><p>Live Performance Center</p><h1>Presentation Remote</h1></div>
    </header>

    <section className="remote-display" aria-labelledby="display-title">
      <div><p>Target display</p><h2 id="display-title">{controller.displayName}</h2></div>
      <label>Control a display
        <select value={selectedDisplayId} onChange={(event) => setSelectedDisplayId(event.target.value)}>
          {controller.displays.map((display) => <option key={display.id} value={display.id}>{display.name}</option>)}
        </select>
      </label>
    </section>

    <section className="remote-status" aria-live="polite">
      <p>Currently showing</p>
      <strong>Slide {controller.activeSlideIndex + 1}</strong>
      <span>{controller.activeSlide?.label}</span>
      <div className={`remote-status__mode ${controller.isRunning ? "is-running" : "is-paused"}`}>
        <i aria-hidden="true" /> Automatic rotation is {controller.isRunning ? "running" : "paused"}
      </div>
      <small>{controller.connectionState === "connected" ? "Connected live" : "Reconnecting…"}</small>
      {controller.event && <div className="remote-event-state" role="status"><b>Event showing</b><span>{controller.event.title}</span><small>Dismisses automatically</small></div>}
    </section>

    <section className="remote-controls" aria-labelledby="rotation-controls-title">
      <h2 id="rotation-controls-title">Rotation controls</h2>
      <div className="remote-controls__primary">
        <button type="button" onClick={controller.pauseRotation} disabled={!controller.isRunning}>Pause Rotation</button>
        <button type="button" onClick={controller.resumeRotation} disabled={controller.isRunning}>Resume Rotation</button>
      </div>
      <div className="remote-controls__direction">
        <button type="button" onClick={controller.previousSlide}>← <span>Previous Slide</span></button>
        <button type="button" onClick={controller.nextSlide}><span>Next Slide</span> →</button>
      </div>
      <button className="remote-controls__restart" type="button" onClick={controller.restartRotationTimer}>Restart Rotation Timer</button>
    </section>

    <nav className="remote-jump" aria-labelledby="jump-title">
      <h2 id="jump-title">Jump to a slide</h2>
      <div>{controller.slides.map((slide, index) => <button
        key={slide.id}
        type="button"
        className={index === controller.activeSlideIndex ? "is-active" : ""}
        aria-current={index === controller.activeSlideIndex ? "true" : undefined}
        onClick={() => controller.selectSlide(index)}
      ><span>Slide {index + 1}</span><small>{slide.label}</small></button>)}</div>
    </nav>
    <section className="remote-management" aria-labelledby="management-title">
      <div><p>Management</p><h2 id="management-title">Dashboard data</h2></div>
      <p>Request a fresh update through the same protected refresh pipeline used by the automatic scheduler.</p>
      <button type="button" onClick={refreshDashboard} disabled={refreshStatus.state === "refreshing"}>
        {refreshStatus.state === "refreshing" ? "Refreshing…" : "Refresh Dashboard Now"}
      </button>
      <div className={`remote-management__status is-${refreshStatus.state}`} role="status" aria-live="polite">{refreshStatus.message}</div>
    </section>
    <p className="remote-note">Commands are synchronized through the backend and sent only to the selected display.</p>
  </main>;
}
