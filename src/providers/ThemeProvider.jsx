import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import "../styles/theme.css";

const ThemeContext = createContext({ theme: "system", setTheme: () => {} });
const STORAGE_KEY = "lms.theme"; // "light" | "dark" | "system"

export function ThemeProvider({ children, defaultTheme = "system" }) {
  const [theme, setTheme] = useState(() => localStorage.getItem(STORAGE_KEY) || defaultTheme);

  // Apply theme to <html data-theme="..."> and toggle Tailwind dark class
  useEffect(() => {
    const root = document.documentElement;
    const systemDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches;
    const resolved = theme === "system" ? (systemDark ? "dark" : "light") : theme;

    root.setAttribute("data-theme", resolved);
    root.classList.toggle("dark", resolved === "dark");
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  // React to OS changes when on "system"
  useEffect(() => {
    if (theme !== "system") return;
    const m = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      const resolved = m.matches ? "dark" : "light";
      document.documentElement.setAttribute("data-theme", resolved);
      document.documentElement.classList.toggle("dark", resolved === "dark");
    };
    m.addEventListener?.("change", handler);
    return () => m.removeEventListener?.("change", handler);
  }, [theme]);

  const value = useMemo(() => ({ theme, setTheme }), [theme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
export const useTheme = () => useContext(ThemeContext);
export default ThemeProvider;
