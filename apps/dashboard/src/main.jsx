import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { PresentationControllerProvider } from "./controller/PresentationController";
import "./styles.css";
import { DisplayErrorBoundary } from "./components/DisplayErrorBoundary";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <DisplayErrorBoundary><PresentationControllerProvider><App /></PresentationControllerProvider></DisplayErrorBoundary>
  </StrictMode>,
);
