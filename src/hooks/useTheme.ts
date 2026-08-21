"use client";

import { useEffect, useSyncExternalStore } from "react";
import type { ResolvedTheme, ThemePreference } from "@/lib/theme";

const QUERY = "(prefers-color-scheme: dark)";

function subscribe(listener: () => void) {
  if (typeof window === "undefined") return () => {};
  const media = window.matchMedia(QUERY);
  media.addEventListener("change", listener);
  return () => media.removeEventListener("change", listener);
}

const systemIsDark = () => (typeof window === "undefined" ? true : window.matchMedia(QUERY).matches);

/**
 * Resolves the preference against the system setting and puts the answer on the
 * root element, where the CSS tokens pick it up. The inline script in the layout
 * has already done this once before paint; this keeps it in step afterwards.
 */
export function useTheme(preference: ThemePreference): ResolvedTheme {
  const prefersDark = useSyncExternalStore(subscribe, systemIsDark, () => true);
  const resolved: ResolvedTheme = preference === "system" ? (prefersDark ? "dark" : "light") : preference;

  useEffect(() => {
    document.documentElement.dataset.theme = resolved;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", resolved === "dark" ? "#12100E" : "#EFEAE0");
  }, [resolved]);

  return resolved;
}
