import { BusinessPerformanceSlide } from "../components/slides/BusinessPerformanceSlide";
import { OperationsHealthSlide } from "../components/slides/OperationsHealthSlide";
import { RecognitionSlide } from "../components/slides/RecognitionSlide";
import { RevenueOverviewSlide } from "../components/slides/RevenueOverviewSlide";
import { TechnicianPerformanceSlide } from "../components/slides/TechnicianPerformanceSlide";

export const PRESENTATION_SLIDES = Object.freeze([
  { id: "revenue-overview", label: "Revenue overview", Component: RevenueOverviewSlide },
  { id: "technician-performance", label: "Technician performance", Component: TechnicianPerformanceSlide },
  { id: "business-performance", label: "Business performance", Component: BusinessPerformanceSlide },
  { id: "recognition", label: "Recognition and achievements", Component: RecognitionSlide },
  { id: "operations-health", label: "Operations health", Component: OperationsHealthSlide },
]);
