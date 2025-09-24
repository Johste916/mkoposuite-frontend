import { createContext, useContext, useEffect, useMemo, useState } from "react";

const ThemeContext = createContext({ theme: "system", setTheme: () => {} });
const STORAGE_KEY = "lms.theme"; // "light" | "dark" | "system"

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem(STORAGE_KEY) || "system");

  // Apply theme to <html data-theme="...">
  useEffect(() => {
    const root = document.documentElement;
    const systemDark =
      window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    const resolved = theme === "system" ? (systemDark ? "dark" : "light") : theme;
    root.setAttribute("data-theme", resolved);
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  // React to OS changes when on "system"
  useEffect(() => {
    if (theme !== "system") return;
    const m = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      document.documentElement.setAttribute("data-theme", m.matches ? "dark" : "light");
    };
    m.addEventListener?.("change", handler);
    return () => m.removeEventListener?.("change", handler);
  }, [theme]);

  const value = useMemo(() => ({ theme, setTheme }), [theme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
