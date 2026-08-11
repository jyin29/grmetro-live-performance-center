import { BusinessPerformanceSlide } from "../components/slides/BusinessPerformanceSlide";
import { OperationsHealthSlide } from "../components/slides/OperationsHealthSlide";
import { RecognitionSlide } from "../components/slides/RecognitionSlide";
import { RevenueOverviewSlide } from "../components/slides/RevenueOverviewSlide";
import { TechnicianPerformanceSlide } from "../components/slides/TechnicianPerformanceSlide";

export const PRESENTATION_SLIDES = Object.freeze([
  { id: "daily-pace", label: "Are we on pace?", Component: RevenueOverviewSlide },
  { id: "team-performance", label: "Who is performing?", Component: TechnicianPerformanceSlide },
  { id: "revenue-sources", label: "Where is revenue coming from?", Component: BusinessPerformanceSlide },
  { id: "top-three", label: "Who deserves recognition?", Component: RecognitionSlide },
  { id: "management-attention", label: "What needs attention?", Component: OperationsHealthSlide },
]);
