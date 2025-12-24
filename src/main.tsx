import React from "react";
import ReactDOM from "react-dom/client";

// Global CSS (Tailwind + custom styles)
import "./globals.css";

// Main App
import App from "./App";

// PWA service worker registration (Vite PWA plugin)
import { registerSW } from "virtual:pwa-register";

import { AuthProvider } from "./lib/authContext";
import AuthErrorBoundary from "./components/AuthErrorBoundary";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AuthProvider>
      <AuthErrorBoundary>
        <App />
      </AuthErrorBoundary>
    </AuthProvider>
  </React.StrictMode>
);

registerSW({
  onNeedRefresh() {
    console.log("New content available, please refresh.");
  },
  onOfflineReady() {
    console.log("App ready to work offline.");
  },
});