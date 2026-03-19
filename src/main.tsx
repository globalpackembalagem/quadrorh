// Main entry point - v4
import React from "react";
import { createRoot } from "react-dom/client";
import { ErrorBoundary } from "./components/layout/ErrorBoundary";
import App from "./App.tsx";
import "./index.css";

// Sinaliza para o fallback global que o React montou com sucesso
(window as any).__APP_LOADED = true;

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
