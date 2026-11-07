import { useEffect, useState } from "react";

export type Theme = "light" | "dark";
const KEY = "bantaybuhay.theme";

// Light is the default. The choice is a per-browser convenience, so storage failures are fine.
function storedTheme(): Theme {
  try {
    return localStorage.getItem(KEY) === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(storedTheme);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem(KEY, theme);
    } catch {
      // Private browsing or blocked storage: the theme still applies for this visit.
    }
  }, [theme]);
  return { theme, setTheme };
}
