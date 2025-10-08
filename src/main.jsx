// src/main.jsx
import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import ThemeProvider from "./providers/ThemeProvider";

// (If you import vendor CSS like bootstrap/flowbite, import them first)
// import "bootstrap/dist/css/bootstrap.css";

import "./styles/tailwind.css";
import "./styles/theme.css"; // ← keep this LAST so tokens override vendor styles

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
      <BrowserRouter basename={basename} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          {/* Bold skin + legacy neutralizer scopes (see theme.css section below) */}
          <div className="app-theme-bold legacy-compat">
            <App />
          </div>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  </React.StrictMode>
);
