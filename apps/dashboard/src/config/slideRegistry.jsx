import { BusinessPerformanceSlide } from "../components/slides/BusinessPerformanceSlide";
import { OperationsHealthSlide } from "../components/slides/OperationsHealthSlide";
import { RecognitionSlide } from "../components/slides/RecognitionSlide";
import { RevenueOverviewSlide } from "../components/slides/RevenueOverviewSlide";
import { TechnicianPerformanceSlide } from "../components/slides/TechnicianPerformanceSlide";

export const PRESENTATION_SLIDES = Object.freeze([
  { id: "revenue", label: "Revenue", Component: RevenueOverviewSlide },
  { id: "sales", label: "Sales", Component: BusinessPerformanceSlide },
  { id: "technicians", label: "Technicians", Component: TechnicianPerformanceSlide },
  { id: "operations", label: "Operations", Component: OperationsHealthSlide },
  { id: "recognition", label: "Recognition", Component: RecognitionSlide },
]);
