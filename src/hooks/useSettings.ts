"use client";

import { useCallback, useSyncExternalStore } from "react";
import { getServerSnapshot, getSnapshot, subscribe, updateSettings } from "@/lib/settingsStore";
import type { Settings } from "@/lib/settings";

const alwaysTrue = () => true;
const alwaysFalse = () => false;

export function useSettings() {
  const settings = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  // False during the hydration render, true from the first client render onward.
  const hydrated = useSyncExternalStore(subscribe, alwaysTrue, alwaysFalse);

  const update = useCallback(
    (patch: Partial<Settings> | ((current: Settings) => Partial<Settings>)) => updateSettings(patch),
    [],
  );

  return { settings, update, hydrated };
}
