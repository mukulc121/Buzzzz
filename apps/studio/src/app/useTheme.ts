import { useEffect, useState } from "react";

export type Theme = "light" | "dark" | "system";
const THEME_KEY = "rive-haptics-theme";

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      const value = localStorage.getItem(THEME_KEY);
      return value === "light" || value === "dark" || value === "system" ? value : "system";
    } catch {
      return "light";
    }
  });

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const updateTheme = () => {
      document.documentElement.dataset.theme =
        theme === "system" ? (media.matches ? "dark" : "light") : theme;
    };
    updateTheme();
    media.addEventListener("change", updateTheme);
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      /* private mode */
    }
    return () => media.removeEventListener("change", updateTheme);
  }, [theme]);

  return { theme, setTheme };
}
