import { useEffect, useRef, useState } from "react";
import { PRESENTATION_SLIDES } from "../config/slideRegistry";
import { SLIDE_TRANSITION_DURATION_MS } from "../config/slideRotation";

export function SlideDeck({ data, displaySettings, slideIndex = 0, onSelectSlide, presentationState = {} }) {
  const slide = PRESENTATION_SLIDES[slideIndex];
  const previousIndexRef = useRef(slideIndex);
  const [outgoingIndex, setOutgoingIndex] = useState(null);

  useEffect(() => {
    if (previousIndexRef.current === slideIndex) return undefined;
    setOutgoingIndex(previousIndexRef.current);
    previousIndexRef.current = slideIndex;
    const timeout = window.setTimeout(() => setOutgoingIndex(null), SLIDE_TRANSITION_DURATION_MS);
    return () => window.clearTimeout(timeout);
  }, [slideIndex]);

  if (!slide) return <section className="state-view" role="alert"><h2>Slide unavailable</h2><p>The selected dashboard slide is not registered.</p></section>;

  const Slide = slide.Component;
  const outgoingSlide = outgoingIndex === null ? null : PRESENTATION_SLIDES[outgoingIndex];
  const OutgoingSlide = outgoingSlide?.Component;

  return <div className="slide-stage">
    <div className="slide-deck slide-deck--active" data-slide-id={slide.id} aria-label={slide.label}>
      <Slide data={data} presentationState={presentationState} metricVisibility={displaySettings?.metrics?.[`slide${slideIndex + 1}`]} />
    </div>
    {OutgoingSlide && <div className="slide-deck slide-deck--outgoing" aria-hidden="true">
      <OutgoingSlide data={data} presentationState={presentationState} metricVisibility={displaySettings?.metrics?.[`slide${outgoingIndex + 1}`]} />
    </div>}
    <nav className="slide-indicator" aria-label="Dashboard slides">
      <span>Slide {slideIndex + 1} of {PRESENTATION_SLIDES.length}</span>
      <div>{PRESENTATION_SLIDES.map((registeredSlide, index) => <button key={registeredSlide.id} type="button" className={index === slideIndex ? "is-active" : ""} aria-label={`Show ${registeredSlide.label}`} aria-current={index === slideIndex ? "true" : undefined} onClick={onSelectSlide ? () => onSelectSlide(index) : undefined} />)}</div>
    </nav>
  </div>;
}
