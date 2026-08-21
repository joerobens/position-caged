"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getAudioEngine } from "@/lib/audio";

const LOOKAHEAD_SECONDS = 0.1;
const SCHEDULER_INTERVAL_MS = 25;

type BeatEvent = { time: number; beat: number; bar: number; pulse: number };
type AdvanceEvent = { time: number; advance: true };
type ScheduledEvent = BeatEvent | AdvanceEvent;

export type MetronomeOptions = {
  bpm: number;
  beats: number;
  click: boolean;
  volume: number;
  /** Bars between shape changes. 0 is off. */
  advanceBars: number;
  onAdvance: () => void;
};

/**
 * Audio-clock metronome. The scheduler runs ahead of the audio playhead and queues
 * events; a rAF loop drains them as they come due so the pips and the shape changes
 * land with the click rather than drifting away from it.
 */
export function useMetronome({ bpm, beats, click, volume, advanceBars, onAdvance }: MetronomeOptions) {
  const [playing, setPlaying] = useState(false);
  const [beat, setBeat] = useState(-1);
  const [bar, setBar] = useState(0);
  // Beats since the transport started, for drills that step on every beat.
  const [pulse, setPulse] = useState(0);

  // Latest values, so changing tempo mid-bar does not tear down the scheduler.
  const options = useRef({ bpm, beats, click, volume, advanceBars, onAdvance });
  useEffect(() => {
    options.current = { bpm, beats, click, volume, advanceBars, onAdvance };
  });

  const queue = useRef<ScheduledEvent[]>([]);
  const nextNoteTime = useRef(0);
  const counter = useRef({ beat: 0, bar: 0, pulse: 0 });
  const timer = useRef<number | null>(null);
  const wakeLock = useRef<WakeLockSentinel | null>(null);

  const stop = useCallback(() => {
    if (timer.current !== null) window.clearInterval(timer.current);
    timer.current = null;
    queue.current = [];
    setPlaying(false);
    setBeat(-1);
    void wakeLock.current?.release().catch(() => {});
    wakeLock.current = null;
  }, []);

  const start = useCallback(() => {
    const engine = getAudioEngine();
    const ctx = engine.ensure();
    counter.current = { beat: 0, bar: 0, pulse: 0 };
    queue.current = [];
    nextNoteTime.current = ctx.currentTime + 0.08;
    setBar(0);
    setPulse(0);
    setPlaying(true);

    timer.current = window.setInterval(() => {
      const { bpm: currentBpm, beats: currentBeats, click: clickOn, volume: level, advanceBars: every } = options.current;
      const secondsPerBeat = 60 / currentBpm;
      while (nextNoteTime.current < engine.now + LOOKAHEAD_SECONDS) {
        const time = nextNoteTime.current;
        const { beat: b, bar: currentBar, pulse: currentPulse } = counter.current;
        if (clickOn) engine.click(time, b === 0, level);
        queue.current.push({ time, beat: b, bar: currentBar, pulse: currentPulse });

        let nextBeat = b + 1;
        let nextBar = currentBar;
        if (nextBeat >= currentBeats) {
          nextBeat = 0;
          nextBar = currentBar + 1;
          // Fire the change on the downbeat of the bar you land in, not the bar you leave.
          if (every > 0 && nextBar % every === 0) queue.current.push({ time: time + secondsPerBeat, advance: true });
        }
        counter.current = { beat: nextBeat, bar: nextBar, pulse: currentPulse + 1 };
        nextNoteTime.current += secondsPerBeat;
      }
    }, SCHEDULER_INTERVAL_MS);

    // Keep the iPad awake while practising.
    if ("wakeLock" in navigator) {
      navigator.wakeLock
        .request("screen")
        .then((sentinel) => {
          wakeLock.current = sentinel;
        })
        .catch(() => {});
    }
  }, []);

  const toggle = useCallback(() => {
    if (playing) stop();
    else start();
  }, [playing, start, stop]);

  // Drain due events on the animation frame so visuals follow the audio clock.
  useEffect(() => {
    if (!playing) return;
    const engine = getAudioEngine();
    let frame = 0;
    const tick = () => {
      const now = engine.now;
      const due: ScheduledEvent[] = [];
      queue.current = queue.current.filter((event) => {
        if (event.time <= now) {
          due.push(event);
          return false;
        }
        return true;
      });
      // Move the neck before lighting the beat, so the downbeat shows the new shape.
      due.sort((a, b) => Number("advance" in b) - Number("advance" in a));
      for (const event of due) {
        if ("advance" in event) options.current.onAdvance();
        else {
          setBeat(event.beat);
          setBar(event.bar);
          setPulse(event.pulse);
        }
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing]);

  // Reacquire the wake lock when the tab comes back to the foreground.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible" && playing && "wakeLock" in navigator) {
        navigator.wakeLock
          .request("screen")
          .then((sentinel) => {
            wakeLock.current = sentinel;
          })
          .catch(() => {});
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [playing]);

  useEffect(() => stop, [stop]);

  return { playing, beat, bar, pulse, start, stop, toggle };
}
