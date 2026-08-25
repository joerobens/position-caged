"use client";

import { useEffect, useState } from "react";
import { getAudioEngine } from "@/lib/audio";

/**
 * Audio on iOS starts locked and only a real gesture opens it. Rather than make
 * that the user's problem, the first touch anywhere unlocks it, and this reports
 * whether that has happened so the interface can say so if it has not.
 */
export function useAudioReady(): boolean {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const engine = getAudioEngine();
    const sync = () => setReady(engine.ready);
    const off = engine.onReadyChange(sync);

    const open = () => {
      void engine.unlock().then(sync);
    };
    // Any gesture will do. Passive, so it never delays the thing you actually tapped.
    const events: (keyof WindowEventMap)[] = ["pointerdown", "touchend", "keydown"];
    for (const event of events) window.addEventListener(event, open, { passive: true });

    // iOS suspends the context whenever the tab goes away.
    const wake = () => {
      if (document.visibilityState === "visible") void engine.unlock().then(sync);
    };
    document.addEventListener("visibilitychange", wake);

    sync();
    return () => {
      off();
      for (const event of events) window.removeEventListener(event, open);
      document.removeEventListener("visibilitychange", wake);
    };
  }, []);

  return ready;
}
