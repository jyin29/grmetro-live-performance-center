import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { PresentationControllerProvider } from "./controller/PresentationController";
import "./styles.css";
import "./remote-mobile-fixes.css";
import "./remote-polish.css";
import "./operations-slide-fixes.css";
import "./final-tv-readability.css";
import "./metric-customization.css";
import "./spreadsheet-slide.css";
import "./measuredSlidingHighlights";
import "./remote-layout-hotfix.css";
import "./remote-stability.css";
import "./local-dashboard-controls.css";
import "./easterEgg";
import { DisplayErrorBoundary } from "./components/DisplayErrorBoundary";

createRoot(document.getElementById("root")).render(<StrictMode><DisplayErrorBoundary><PresentationControllerProvider><App /></PresentationControllerProvider></DisplayErrorBoundary></StrictMode>);
