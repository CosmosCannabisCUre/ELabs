import { createContext, useContext, useEffect, useState, useCallback } from "react";

const ThemeContext = createContext({ theme: "dark", toggle: () => {}, override: false });

const STORAGE_KEY = "ccc_theme_override"; // "light" | "dark" | null

// Auto rule: light between 6:00 and 18:00 local time, dark otherwise.
function autoTheme() {
  const h = new Date().getHours();
  return h >= 6 && h < 18 ? "light" : "dark";
}

function initialTheme() {
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved === "light" || saved === "dark" ? saved : autoTheme();
}

function apply(theme) {
  const root = document.documentElement;
  root.classList.remove("theme-light", "theme-dark");
  root.classList.add(theme === "light" ? "theme-light" : "theme-dark");
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(initialTheme);
  const [override, setOverride] = useState(() => {
    const s = localStorage.getItem(STORAGE_KEY);
    return s === "light" || s === "dark";
  });

  useEffect(() => { apply(theme); }, [theme]);

  // Re-evaluate auto theme periodically (every 5 min) when not overridden
  useEffect(() => {
    if (override) return;
    const id = setInterval(() => setTheme(autoTheme()), 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [override]);

  const toggle = useCallback(() => {
    setTheme((prev) => {
      const next = prev === "light" ? "dark" : "light";
      localStorage.setItem(STORAGE_KEY, next);
      setOverride(true);
      return next;
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggle, override }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
