"use client";

import { useEffect, useRef } from "react";

/**
 * Keeps the screen on. A stand is exactly where a display sleeping is worst: your
 * hands are on the guitar, so waking it costs you the song.
 */
export function useWakeLock(active: boolean) {
  const sentinel = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    if (!active || !("wakeLock" in navigator)) return;
    let cancelled = false;

    const request = () => {
      navigator.wakeLock
        .request("screen")
        .then((lock) => {
          if (cancelled) void lock.release().catch(() => {});
          else sentinel.current = lock;
        })
        .catch(() => {});
    };
    request();

    // iOS drops the lock whenever the tab goes to the background.
    const onVisible = () => {
      if (document.visibilityState === "visible") request();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      void sentinel.current?.release().catch(() => {});
      sentinel.current = null;
    };
  }, [active]);
}
