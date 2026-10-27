import { useEffect, useRef, useState } from "react";
import { PRESENTATION_SLIDES } from "../config/slideRegistry";
import { SLIDE_TRANSITION_DURATION_MS } from "../config/slideRotation";
import { filterEligibleSlides, resolveActiveEligibleSlide } from "../config/slideEligibility";

export function SlideDeck({ data, spreadsheetSlide, spreadsheetAvailable = false, slides = PRESENTATION_SLIDES.map((slide, index) => ({ ...slide, index })), displaySettings, slideIndex = 0, slideId = null, onSelectSlide, presentationState = {} }) {
  const eligibleSlides = filterEligibleSlides(slides, spreadsheetAvailable);
  const selection = resolveActiveEligibleSlide(eligibleSlides, slideId, slideIndex);
  const slide = selection.slide;
  const activeIndex = slide?.index ?? 0;
  const previousIndexRef = useRef(activeIndex);
  const [outgoingIndex, setOutgoingIndex] = useState(null);
  useEffect(() => { if (previousIndexRef.current === activeIndex) return undefined; setOutgoingIndex(previousIndexRef.current); previousIndexRef.current = activeIndex; const timeout = window.setTimeout(() => setOutgoingIndex(null), SLIDE_TRANSITION_DURATION_MS); return () => window.clearTimeout(timeout); }, [activeIndex]);
  if (!slide) return <section className="state-view" role="alert"><h2>Slide unavailable</h2><p>The selected dashboard slide is not registered.</p></section>;
  const Slide = slide.Component; const outgoingSlide = outgoingIndex === null ? null : eligibleSlides.find((candidate) => candidate.index === outgoingIndex); const OutgoingSlide = outgoingSlide?.Component;
  const propsFor = (index) => ({ data, spreadsheetSlide, presentationState, metricVisibility: displaySettings?.metrics?.[`slide${index + 1}`] });
  return <div className="slide-stage">
    <div className="slide-deck slide-deck--active" data-slide-id={slide.id} aria-label={slide.label}><Slide {...propsFor(activeIndex)} /></div>
    {OutgoingSlide && <div className="slide-deck slide-deck--outgoing" aria-hidden="true"><OutgoingSlide {...propsFor(outgoingIndex)} /></div>}
    <nav className="slide-indicator" aria-label="Dashboard slides"><span>Slide {selection.position + 1} of {selection.count}</span><div>{eligibleSlides.map((registeredSlide) => <button key={registeredSlide.id} type="button" className={registeredSlide.id === slide.id ? "is-active" : ""} aria-label={`Show ${registeredSlide.label}`} aria-current={registeredSlide.id === slide.id ? "true" : undefined} onClick={onSelectSlide ? () => onSelectSlide(registeredSlide.id) : undefined} />)}</div></nav>
  </div>;
}
