"use client";

import { CaretDown, SpeakerSimpleSlash } from "@phosphor-icons/react";
import Popover from "./Popover";
import { Segmented, Slider, Toggle } from "./controls";
import { KEYS, keyLabel, type Tonality } from "@/lib/music";
import { TOPICS, clockFor, topicOf, type Clock, type Topic } from "@/lib/topics";
import { useAudioReady } from "@/hooks/useAudioReady";
import { ICON } from "@/lib/icons";

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
