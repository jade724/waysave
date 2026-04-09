import React from "react";
import ReactDOM from "react-dom/client";

import "./globals.css";

import App from "./App";

import { AuthProvider } from "./lib/authContext";
import { ToastProvider } from "./lib/toastContext";
import AuthErrorBoundary from "./components/AuthErrorBoundary";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AuthProvider>
      <ToastProvider>
        <AuthErrorBoundary>
          <App />
        </AuthErrorBoundary>
      </ToastProvider>
    </AuthProvider>
  </React.StrictMode>
);
