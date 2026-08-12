import logoUrl from "../../../../assets/branding/grmetro-logo.png";
import { useState } from "react";
import { DEFAULT_DISPLAY_ID } from "../config/displayRegistry";
import { usePresentationController } from "../controller/PresentationController";

export function RemoteControlPage() {
  const [selectedDisplayId, setSelectedDisplayId] = useState(DEFAULT_DISPLAY_ID);
  const controller = usePresentationController(selectedDisplayId);
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
    <p className="remote-note">Commands are local to this browser. No display state is sent over the network.</p>
  </main>;
}
