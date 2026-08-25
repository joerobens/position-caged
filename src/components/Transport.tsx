"use client";

import { useCallback, useRef } from "react";
import { Pause, Play } from "@phosphor-icons/react";

type Props = {
  playing: boolean;
  onToggle: () => void;
  bpm: number;
  onBpm: (bpm: number) => void;
  beats: number;
  beat: number;
  bar: number;
};

export const MIN_BPM = 40;
export const MAX_BPM = 220;

export default function Transport({ playing, onToggle, bpm, onBpm, beats, beat, bar }: Props) {
  const taps = useRef<number[]>([]);

  const tap = useCallback(() => {
    const now = performance.now();
    const previous = taps.current;
    // A long gap means you started tapping a new tempo, not continuing the old one.
    if (previous.length && now - previous[previous.length - 1] > 2000) previous.length = 0;
    previous.push(now);
    if (previous.length > 5) previous.shift();
    if (previous.length > 1) {
      let total = 0;
      for (let i = 1; i < previous.length; i++) total += previous[i] - previous[i - 1];
      onBpm(Math.round(60000 / (total / (previous.length - 1))));
    }
  }, [onBpm]);

  return (
    <div className="panel flex flex-wrap items-center gap-x-5 gap-y-3">
      <button
        type="button"
        onClick={onToggle}
        aria-label={playing ? "Stop metronome" : "Start metronome"}
        className="flex size-16 flex-none items-center justify-center rounded-full border-2 transition-colors active:scale-[0.97] sm:size-[70px]"
        style={{
          borderColor: "var(--accent)",
          background: playing ? "var(--accent)" : "transparent",
          color: playing ? "var(--on-accent)" : "var(--accent)",
        }}
      >
        {playing ? <Pause size={26} weight="fill" /> : <Play size={26} weight="fill" />}
      </button>

      <div className="flex flex-none items-baseline gap-2">
        <span className="text-[44px] font-bold leading-none tracking-[-0.03em] tabular-nums sm:text-[56px]">{bpm}</span>
        <span className="label">bpm</span>
      </div>

      <input
        className="min-w-[180px] flex-1"
        type="range"
        min={MIN_BPM}
        max={MAX_BPM}
        step={1}
        value={bpm}
        aria-label="Tempo"
        onChange={(event) => onBpm(Number(event.target.value))}
      />

      <button type="button" className="chip flex-none" onClick={tap}>
        Tap tempo
      </button>

      <div className="flex flex-none gap-2" aria-hidden="true">
        {Array.from({ length: beats }, (_, index) => {
          const hit = playing && index === beat;
          return (
            <div
              key={index}
              className="size-4 rounded-full border-[1.5px] transition-transform duration-75"
              style={{
                borderColor: hit ? "var(--accent)" : "var(--color-line)",
                background: hit ? "var(--accent)" : "transparent",
                transform: hit ? (index === 0 ? "scale(1.75)" : "scale(1.45)") : "scale(1)",
              }}
            />
          );
        })}
      </div>

      <div className="flex-none font-mono text-[13px] text-bone-dim">
        bar <b className="font-medium text-bone">{playing ? bar + 1 : 0}</b>
      </div>
    </div>
  );
}
