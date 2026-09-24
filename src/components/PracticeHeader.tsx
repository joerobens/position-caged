"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { CaretDown, SpeakerSimpleSlash } from "@phosphor-icons/react";
import { Segmented, Slider, Toggle } from "./controls";
import { KEYS, keyLabel, type Tonality } from "@/lib/music";
import { TOPICS, clockFor, topicOf, type Clock, type Topic } from "@/lib/topics";
import { useAudioReady } from "@/hooks/useAudioReady";
import { ICON } from "@/lib/icons";

/** A panel that hangs off a button and goes away when you tap anywhere else. */
function Popover({
  label,
  button,
  children,
  className = "",
}: {
  label: string;
  button: (open: boolean) => ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (event: PointerEvent) => {
      if (!wrap.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={wrap} className="relative">
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="flex min-h-11 items-center gap-2.5 rounded-[10px] border border-line bg-panel px-3.5 text-bone transition-colors hover:border-bone-dim focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bone"
      >
        {button(open)}
      </button>
      {open ? (
        <div
          className={`absolute left-0 top-[calc(100%+8px)] z-40 flex w-[min(380px,calc(100vw-32px))] flex-col gap-3 rounded-2xl border border-line bg-panel p-3.5 shadow-lg shadow-black/30 ${className}`}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}

type Patch = {
  root?: number;
  tonality?: Tonality;
  drone?: boolean;
  droneFifth?: boolean;
  droneOctave?: number;
  droneVolume?: number;
};

/**
 * Everything Practice asks before the neck: which key, whether the drone is
 * sounding it, what you are working on, and whether the clock is running. The
 * key is here in every topic, so changing it never means going somewhere else.
 */
export default function PracticeHeader({
  root,
  tonality,
  drone,
  droneFifth,
  droneOctave,
  droneVolume,
  topic,
  clock,
  onKey,
  onChange,
  onTopic,
  onClock,
}: {
  root: number;
  tonality: Tonality;
  drone: boolean;
  droneFifth: boolean;
  droneOctave: number;
  droneVolume: number;
  topic: Topic;
  clock: Clock;
  onKey: (root: number, tonality: Tonality) => void;
  onChange: (patch: Patch) => void;
  onTopic: (topic: Topic) => void;
  onClock: (clock: Clock) => void;
}) {
  const audioReady = useAudioReady();
  const entry = topicOf(topic);
  const fingers = topic === "fingers";

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* The finger exercise has no key, so it does not pretend to. */}
      {!fingers ? (
        <Popover
          label={`Key: ${keyLabel(root, tonality)}. Change it`}
          button={(open) => (
            <>
              <span className="label">Key</span>
              <b className="text-[17px] font-medium tracking-tight">
                {KEYS[root]} {tonality}
              </b>
              <CaretDown size={ICON.sm} weight="bold" className="text-bone-dim" style={{ transform: open ? "rotate(180deg)" : undefined }} />
            </>
          )}
        >
          <Segmented
            ariaLabel="Tonality"
            value={tonality}
            onChange={(next) => onKey(root, next)}
            options={[
              { value: "major", label: "Major" },
              { value: "minor", label: "Minor" },
            ]}
          />
          <div role="group" aria-label="Key" className="grid grid-cols-6 gap-1.5">
            {KEYS.map((name, index) => (
              <button
                key={name}
                type="button"
                className="chip px-0"
                aria-pressed={index === root}
                onClick={() => onKey(index, tonality)}
              >
                {name}
              </button>
            ))}
          </div>
        </Popover>
      ) : null}

      <div className="flex items-center">
        <Toggle on={drone} onChange={(value) => onChange({ drone: value })}>
          Drone
        </Toggle>
        <Popover
          label="Drone settings"
          className="left-auto right-0 sm:left-0 sm:right-auto"
          button={(open) => (
            <CaretDown size={ICON.sm} weight="bold" style={{ transform: open ? "rotate(180deg)" : undefined }} />
          )}
        >
          <span className="label">Drone</span>
          <Segmented
            ariaLabel="Drone octave"
            value={droneOctave}
            onChange={(value) => onChange({ droneOctave: value })}
            options={[
              { value: -1, label: "Low" },
              { value: 0, label: "Mid" },
              { value: 1, label: "High" },
            ]}
          />
          <Toggle on={droneFifth} onChange={(value) => onChange({ droneFifth: value })}>
            With the fifth
          </Toggle>
          <Slider
            label="Drone volume"
            value={Math.round(droneVolume * 100)}
            min={0}
            max={100}
            onChange={(value) => onChange({ droneVolume: value / 100 })}
            display={`${Math.round(droneVolume * 100)}%`}
          />
        </Popover>
      </div>

      <Segmented
        ariaLabel="Topic"
        value={topic}
        onChange={onTopic}
        options={TOPICS.map((option) => ({ value: option.value, label: option.label, title: option.title }))}
      />

      {entry.explore && entry.drill ? (
        <div className="ml-auto">
          <Segmented
            ariaLabel="Clock"
            value={clockFor(topic, clock)}
            onChange={onClock}
            options={[
              { value: "explore", label: "Explore", title: "No clock. Look around." },
              { value: "drill", label: "Drill", title: "Against the metronome." },
            ]}
          />
        </div>
      ) : null}

      {/* Silence with no explanation reads as broken, so say which silence it is. */}
      {!audioReady ? (
        <span className="flex w-full items-center gap-1.5 text-[12px] text-bone-dim">
          <SpeakerSimpleSlash size={ICON.sm} weight="bold" />
          Tap anywhere to turn sound on
        </span>
      ) : null}
    </div>
  );
}
