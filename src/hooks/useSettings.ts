"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { DEFAULT_SETTINGS, loadSettings, saveSettings, type Settings } from "@/lib/settings";

/**
 * Settings live in localStorage but must not be read during render, or the server
 * markup and the first client render disagree. We start from the defaults and swap
 * in the stored values once mounted.
 */
export function useSettings() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [hydrated, setHydrated] = useState(false);
  const firstRun = useRef(true);

  useEffect(() => {
    setSettings(loadSettings());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    if (hydrated) saveSettings(settings);
  }, [settings, hydrated]);

  const update = useCallback((patch: Partial<Settings> | ((current: Settings) => Partial<Settings>)) => {
    setSettings((current) => ({ ...current, ...(typeof patch === "function" ? patch(current) : patch) }));
  }, []);

  return { settings, update, hydrated };
}
