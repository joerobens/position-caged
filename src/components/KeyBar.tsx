"use client";

import { useState } from "react";
import { CaretDown, CircleHalf, Moon, SpeakerSimpleSlash, Sun } from "@phosphor-icons/react";
import { Segmented, Slider, Toggle } from "./controls";
import { keyLabel, type Tonality } from "@/lib/music";
import type { ThemePreference } from "@/lib/theme";
import { useAudioReady } from "@/hooks/useAudioReady";
import { ICON } from "@/lib/icons";

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
  theme,
  onChange,
}: {
  root: number;
  tonality: Tonality;
  drone: boolean;
  droneFifth: boolean;
  droneOctave: number;
  droneVolume: number;
  theme: ThemePreference;
  onChange: (patch: {
    drone?: boolean;
    droneFifth?: boolean;
    droneOctave?: number;
    droneVolume?: number;
    theme?: ThemePreference;
  }) => void;
}) {
  const [open, setOpen] = useState(false);
  const audioReady = useAudioReady();

  return (
    <div className="rounded-2xl border border-line bg-panel px-4 py-2.5">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="text-base font-medium tracking-tight" style={{ color: "var(--accent)" }}>
          {keyLabel(root, tonality)}
        </span>
        <Toggle on={drone} onChange={(value) => onChange({ drone: value })}>
          {drone ? "Drone on" : "Drone off"}
        </Toggle>
        {/* Silence with no explanation reads as broken, so say which silence it is. */}
        {!audioReady ? (
          <span className="flex items-center gap-1.5 text-[12px] text-bone-dim">
            <SpeakerSimpleSlash size={ICON.sm} weight="bold" />
            tap anywhere to turn sound on
          </span>
        ) : null}
        <div className="ml-auto flex items-center gap-2">
          <ThemeButton theme={theme} onChange={(next) => onChange({ theme: next })} />
          <button
            type="button"
            className="btn flex items-center gap-1.5"
            aria-expanded={open}
            onClick={() => setOpen((current) => !current)}
          >
            <span className="hidden sm:inline">Drone settings</span>
            <span className="sm:hidden">Drone</span>
            <CaretDown size={ICON.sm} weight="bold" style={{ transform: open ? "rotate(180deg)" : undefined }} />
          </button>
        </div>
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

const THEME_ORDER: ThemePreference[] = ["system", "light", "dark"];
const THEME_LABEL: Record<ThemePreference, string> = {
  system: "Theme: following the system",
  light: "Theme: light",
  dark: "Theme: dark",
};

/** Cycles system, light, dark. One button, because it is a preference, not a mode. */
function ThemeButton({
  theme,
  onChange,
}: {
  theme: ThemePreference;
  onChange: (theme: ThemePreference) => void;
}) {
  const Icon = theme === "light" ? Sun : theme === "dark" ? Moon : CircleHalf;
  return (
    <button
      type="button"
      className="btn flex items-center justify-center px-3"
      aria-label={THEME_LABEL[theme]}
      title={THEME_LABEL[theme]}
      onClick={() => onChange(THEME_ORDER[(THEME_ORDER.indexOf(theme) + 1) % THEME_ORDER.length])}
    >
      <Icon size={ICON.md} weight="bold" />
    </button>
  );
}
