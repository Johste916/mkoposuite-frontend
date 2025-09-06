// src/main.jsx
import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import "./styles/tailwind.css";

// Optional impersonation bootstrap: if ?token=... present, store it then clean URL.
// Harmless if unused; does not affect normal sign-in flows.
(function bootstrapImpersonation() {
  try {
    const url = new URL(window.location.href);
    const token = url.searchParams.get("token");
    if (token) {
      localStorage.setItem("token", token);
      localStorage.setItem("authToken", token); // common alias
      url.searchParams.delete("token");
      window.history.replaceState({}, "", url.toString());
    }
  } catch {}
})();

// Use Vite's BASE_URL if set (falls back to "/")
const basename = (import.meta?.env?.BASE_URL ?? "/") || "/";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter
      basename={basename}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
