import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { ErrorBoundary } from "./components/error-boundary";
import { TooltipProvider } from "./components/ui/tooltip";
import { ensureFrontendStateCompatibility } from "./lib/ezta-storage";
import "./index.css";

ensureFrontendStateCompatibility();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <TooltipProvider delay={400}>
        <App />
      </TooltipProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);
