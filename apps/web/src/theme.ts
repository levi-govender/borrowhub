import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

export type Theme = "light" | "dark";

const STORAGE_KEY = "borrowhub.theme";

function readStored(): Theme | null {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return value === "light" || value === "dark" ? value : null;
  } catch {
    return null;
  }
}

function systemTheme(): Theme {
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/**
 * Theme choice: starts from the OS setting and follows it while it is the only
 * signal; a viewer's explicit pick wins and persists. Storage can be
 * unavailable (private windows), so every access is guarded and the UI still
 * works without it.
 */
export function useTheme(): { theme: Theme; toggle: () => void } {
  const [theme, setTheme] = useState<Theme>(() => readStored() ?? systemTheme());
  // Whether the viewer picked a theme, as opposed to inheriting the OS one.
  const picked = useRef(readStored() !== null);

  // Layout effect, not a passive one: the attribute has to land before the
  // first paint or a stored choice flashes the other theme.
  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme;
    if (!picked.current) {
      return;
    }
    try {
      window.localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* no-op: the choice just does not persist */
    }
  }, [theme]);

  useEffect(() => {
    const query = window.matchMedia?.("(prefers-color-scheme: dark)");
    if (!query) {
      return;
    }
    const onChange = (event: MediaQueryListEvent) => {
      if (!picked.current) {
        setTheme(event.matches ? "dark" : "light");
      }
    };
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  const toggle = useCallback(() => {
    picked.current = true;
    setTheme((current) => (current === "dark" ? "light" : "dark"));
  }, []);

  return { theme, toggle };
}
