import { RevenueOverviewSlide } from "./slides/RevenueOverviewSlide";
import { TechnicianPerformanceSlide } from "./slides/TechnicianPerformanceSlide";

export const dashboardSlides = [
  { id: "revenue-overview", label: "Revenue overview", Component: RevenueOverviewSlide },
  { id: "technician-performance", label: "Technician performance", Component: TechnicianPerformanceSlide },
];

export function SlideDeck({ data, slideIndex = 0 }) {
  const slide = dashboardSlides[slideIndex];

  if (!slide) {
    return <section className="state-view" role="alert"><h2>Slide unavailable</h2><p>The selected dashboard slide is not registered.</p></section>;
  }

  const Slide = slide.Component;
  return <div className="slide-deck" data-slide-id={slide.id} aria-label={slide.label}>
    <Slide data={data} />
  </div>;
}
