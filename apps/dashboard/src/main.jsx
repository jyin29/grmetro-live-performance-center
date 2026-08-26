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

// The primary local display is intentionally shown at the same size as Edge's
// 50% page zoom. Do not apply this to the remote/admin interfaces.
const pathname = window.location.pathname.replace(/\/$/, "") || "/";
const isPrimaryDisplay = pathname === "/" || pathname === "/display" || pathname.startsWith("/display/");
if (isPrimaryDisplay) {
  document.documentElement.style.zoom = "0.5";
}

createRoot(document.getElementById("root")).render(<StrictMode><DisplayErrorBoundary><PresentationControllerProvider><App /></PresentationControllerProvider></DisplayErrorBoundary></StrictMode>);
