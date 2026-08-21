import { DEFAULT_SETTINGS, loadSettings, saveSettings, type Settings } from "./settings";

/**
 * Settings live outside React so they can be read through `useSyncExternalStore`.
 * That is what keeps localStorage out of the render path: React hydrates against the
 * defaults, then swaps in the stored values, with no mismatch and no setState in an effect.
 */
let cache: Settings | null = null;
const listeners = new Set<() => void>();

export function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getSnapshot(): Settings {
  if (!cache) cache = loadSettings();
  return cache;
}

export function getServerSnapshot(): Settings {
  return DEFAULT_SETTINGS;
}

export function updateSettings(patch: Partial<Settings> | ((current: Settings) => Partial<Settings>)) {
  const current = getSnapshot();
  const next = { ...current, ...(typeof patch === "function" ? patch(current) : patch) };
  cache = next;
  saveSettings(next);
  for (const listener of listeners) listener();
}
