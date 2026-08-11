import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { PresentationControllerProvider } from "./controller/PresentationController";
import "./styles.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <PresentationControllerProvider><App /></PresentationControllerProvider>
  </StrictMode>,
);
