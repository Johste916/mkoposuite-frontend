// src/main.jsx
import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import ThemeProvider from "./providers/ThemeProvider";

// If you use vendor CSS (bootstrap/flowbite), import them first.
// import "bootstrap/dist/css/bootstrap.css";

/**
 * IMPORTANT:
 * Only import Tailwind once. Our tailwind entry file already @imports theme tokens.
 * Avoid importing theme.css twice to prevent order flicker.
 */
import "./styles/tailwind.css";

// Optional impersonation bootstrap
(function bootstrapImpersonation() {
  try {
    const url = new URL(window.location.href);
    const token = url.searchParams.get("token");
    if (token) {
      localStorage.setItem("token", token);
      localStorage.setItem("authToken", token);
      url.searchParams.delete("token");
      window.history.replaceState({}, "", url.toString());
    }
  } catch {}
})();

const basename = (import.meta?.env?.BASE_URL ?? "/") || "/";
const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("Missing <div id='root'> in index.html");

createRoot(rootEl).render(
  <React.StrictMode>
    <ThemeProvider>
      <BrowserRouter
        basename={basename}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <AuthProvider>
          {/* Bold skin + legacy compat so borders/inputs look crisp everywhere */}
          <div className="app-theme-bold legacy-compat">
            <App />
          </div>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  </React.StrictMode>
);
