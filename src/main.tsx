// Main entry point - v4
import React from "react";
import { createRoot } from "react-dom/client";
import { ErrorBoundary } from "./components/layout/ErrorBoundary";
import App from "./App.tsx";
import "./index.css";
import { instalarNormalizacaoGlobalCampos } from "./lib/normalizacao";

instalarNormalizacaoGlobalCampos();

// Sinaliza para o fallback global que o React montou com sucesso
(window as any).__APP_LOADED = true;

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((error) => {
      console.warn("[PWA] Service worker nao registrado:", error);
    });
  });
}
