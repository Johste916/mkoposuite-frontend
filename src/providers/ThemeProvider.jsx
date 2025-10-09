import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import "../styles/theme.css"; // tokens + skins loaded once here

const STORAGE_KEY = "lms.theme"; // "light" | "dark" | "system"

const ThemeContext = createContext({
  theme: "system",
  setTheme: () => {},
  resolvedTheme: "light",
  isDark: false,
  toggleTheme: () => {},
  cycleTheme: () => {},
});

export function ThemeProvider({ children, defaultTheme = "system" }) {
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) || defaultTheme;
    } catch {
      return defaultTheme;
    }
  });

  const systemPrefersDark =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-color-scheme: dark)").matches;

  const resolved = theme === "system" ? (systemPrefersDark ? "dark" : "light") : theme;

  // Apply to <html>
  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    root.setAttribute("data-theme", resolved);
    root.classList.toggle("dark", resolved === "dark");
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {}
  }, [theme, resolved]);

  // React to OS changes when set to "system"
  useEffect(() => {
    if (theme !== "system" || typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      const next = mq.matches ? "dark" : "light";
      const root = document.documentElement;
      root.setAttribute("data-theme", next);
      root.classList.toggle("dark", next === "dark");
    };
    mq.addEventListener?.("change", handler);
    return () => mq.removeEventListener?.("change", handler);
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === "dark" ? "light" : "dark"));
  const cycleTheme = () =>
    setTheme((t) => (t === "light" ? "dark" : t === "dark" ? "system" : "light"));

  const value = useMemo(
    () => ({
      theme,
      setTheme,
      resolvedTheme: resolved,
      isDark: resolved === "dark",
      toggleTheme,
      cycleTheme,
    }),
    [theme, resolved]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
export default ThemeProvider;
