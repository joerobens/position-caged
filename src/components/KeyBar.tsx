"use client";

import { useState } from "react";
import { CaretDown } from "@phosphor-icons/react";
import { Segmented, Slider, Toggle } from "./controls";
import { keyLabel, type Tonality } from "@/lib/music";

/**
 * Always on, in both modes. The drone sounds the key rather than belonging to a
 * mode, so it lives here with the key instead of inside Learn or Practice.
 */
export default function KeyBar({
  root,
  tonality,
  drone,
  droneFifth,
  droneOctave,
  droneVolume,
  onChange,
}: {
  root: number;
  tonality: Tonality;
  drone: boolean;
  droneFifth: boolean;
  droneOctave: number;
  droneVolume: number;
  onChange: (patch: {
    drone?: boolean;
    droneFifth?: boolean;
    droneOctave?: number;
    droneVolume?: number;
  }) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-2xl border border-line bg-panel px-4 py-2.5">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="text-base font-medium tracking-tight" style={{ color: "var(--accent)" }}>
          {keyLabel(root, tonality)}
        </span>
        <Toggle on={drone} onChange={(value) => onChange({ drone: value })}>
          {drone ? "Drone on" : "Drone off"}
        </Toggle>
        <button
          type="button"
          className="chip ml-auto flex items-center gap-1.5"
          aria-expanded={open}
          onClick={() => setOpen((current) => !current)}
        >
          Drone settings
          <CaretDown size={14} weight="bold" style={{ transform: open ? "rotate(180deg)" : undefined }} />
        </button>
      </div>
      {open ? (
        <div className="mt-3 flex flex-wrap items-end gap-x-6 gap-y-3 border-t border-line pt-3">
          <div className="flex flex-col gap-2">
            <span className="label">Octave</span>
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
          </div>
          <Toggle on={droneFifth} onChange={(value) => onChange({ droneFifth: value })}>
            With fifth
          </Toggle>
          <div className="min-w-[200px] flex-1">
            <Slider
              label="Drone volume"
              value={Math.round(droneVolume * 100)}
              min={0}
              max={100}
              onChange={(value) => onChange({ droneVolume: value / 100 })}
              display={`${Math.round(droneVolume * 100)}%`}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
