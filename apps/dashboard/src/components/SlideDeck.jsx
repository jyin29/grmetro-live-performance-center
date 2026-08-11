import { useEffect, useRef, useState } from "react";
import { SLIDE_TRANSITION_DURATION_MS } from "../config/slideRotation";
import { RevenueOverviewSlide } from "./slides/RevenueOverviewSlide";
import { TechnicianPerformanceSlide } from "./slides/TechnicianPerformanceSlide";
import { BusinessPerformanceSlide } from "./slides/BusinessPerformanceSlide";

export const dashboardSlides = [
  { id: "revenue-overview", label: "Revenue overview", Component: RevenueOverviewSlide },
  { id: "technician-performance", label: "Technician performance", Component: TechnicianPerformanceSlide },
  { id: "business-performance", label: "Business performance", Component: BusinessPerformanceSlide },
];

export function SlideDeck({ data, slideIndex = 0, onSelectSlide }) {
  const slide = dashboardSlides[slideIndex];
  const previousIndexRef = useRef(slideIndex);
  const [outgoingIndex, setOutgoingIndex] = useState(null);

  useEffect(() => {
    if (previousIndexRef.current === slideIndex) return undefined;

    setOutgoingIndex(previousIndexRef.current);
    previousIndexRef.current = slideIndex;
    const timeout = window.setTimeout(() => setOutgoingIndex(null), SLIDE_TRANSITION_DURATION_MS);
    return () => window.clearTimeout(timeout);
  }, [slideIndex]);

  if (!slide) {
    return <section className="state-view" role="alert"><h2>Slide unavailable</h2><p>The selected dashboard slide is not registered.</p></section>;
  }

  const Slide = slide.Component;
  const OutgoingSlide = outgoingIndex === null ? null : dashboardSlides[outgoingIndex]?.Component;

  return <div className="slide-stage">
    <div className="slide-deck slide-deck--active" data-slide-id={slide.id} aria-label={slide.label}>
      <Slide data={data} />
    </div>
    {OutgoingSlide && <div className="slide-deck slide-deck--outgoing" aria-hidden="true">
      <OutgoingSlide data={data} />
    </div>}
    <nav className="slide-indicator" aria-label="Dashboard slides">
      <span>Slide {slideIndex + 1} of {dashboardSlides.length}</span>
      <div>
        {dashboardSlides.map((registeredSlide, index) => <button
          key={registeredSlide.id}
          type="button"
          className={index === slideIndex ? "is-active" : ""}
          aria-label={`Show ${registeredSlide.label}`}
          aria-current={index === slideIndex ? "true" : undefined}
          onClick={onSelectSlide ? () => onSelectSlide(index) : undefined}
        />)}
      </div>
    </nav>
  </div>;
}
