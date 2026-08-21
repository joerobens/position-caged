"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Fretboard from "@/components/Fretboard";
import Transport, { MAX_BPM, MIN_BPM } from "@/components/Transport";
import { ChipGroup, Field, Segmented, Slider, Toggle } from "@/components/controls";
import { useMetronome } from "@/hooks/useMetronome";
import { useSettings } from "@/hooks/useSettings";
import { getAudioEngine } from "@/lib/audio";
import { KEYS, SCALES, buildPositions, keyLabel } from "@/lib/music";
import { scaleForTonality, type AdvanceMode, type Settings } from "@/lib/settings";

type Tab = "shape" | "drill" | "sound";

const ADVANCE_MODES: { value: AdvanceMode; label: string; title: string }[] = [
  { value: "up", label: "Up the neck", title: "Step to the next shape toward the body" },
  { value: "down", label: "Down", title: "Step to the next shape toward the nut" },
  { value: "random", label: "Random", title: "Jump to any other shape" },
  { value: "pair", label: "Two shapes", title: "Slide back and forth between two positions" },
];

/** Where the next shape change lands, given the drill mode. */
function advancePatch(settings: Settings, count: number): Partial<Settings> {
  switch (settings.advanceMode) {
    case "down":
      return { positionIndex: (settings.positionIndex - 1 + count) % count };
    case "random": {
      if (count < 2) return {};
      let next = settings.positionIndex;
      while (next === settings.positionIndex) next = Math.floor(Math.random() * count);
      return { positionIndex: next };
    }
    case "pair":
      return { positionIndex: settings.pairIndex, pairIndex: settings.positionIndex };
    default:
      return { positionIndex: (settings.positionIndex + 1) % count };
  }
}

export default function Page() {
  const { settings, update, hydrated } = useSettings();
  const [tab, setTab] = useState<Tab>("shape");

  const positions = useMemo(() => buildPositions(settings.root, settings.tonality), [settings.root, settings.tonality]);
  const position = positions[Math.min(settings.positionIndex, positions.length - 1)];
  const pairPosition = settings.advanceMode === "pair" ? positions[Math.min(settings.pairIndex, positions.length - 1)] : null;
  const intervals = SCALES[settings.tonality][settings.scale] ?? Object.values(SCALES[settings.tonality])[0];

  // The accent follows the shape, so the whole interface tells you where you are.
  useEffect(() => {
    document.documentElement.style.setProperty("--accent", position.shape.colour);
  }, [position.shape.colour]);

  const advance = useCallback(() => {
    update((current) => advancePatch(current, positions.length));
  }, [update, positions.length]);

  const metronome = useMetronome({
    bpm: settings.bpm,
    beats: settings.beats,
    click: settings.click,
    volume: settings.clickVolume,
    advanceBars: settings.advanceBars,
    onAdvance: advance,
  });

  // Drone. Retunes rather than restarting, so changing key mid-practice does not click.
  useEffect(() => {
    const engine = getAudioEngine();
    if (!settings.drone) {
      engine.stopDrone();
      return;
    }
    engine.setDrone({
      pitchClass: settings.root,
      octave: settings.droneOctave,
      volume: settings.droneVolume,
      fifth: settings.droneFifth,
    });
  }, [settings.drone, settings.root, settings.droneOctave, settings.droneVolume, settings.droneFifth]);

  useEffect(() => () => getAudioEngine().stopDrone(), []);

  const setBpm = useCallback(
    (value: number) => update({ bpm: Math.min(MAX_BPM, Math.max(MIN_BPM, Math.round(value))) }),
    [update],
  );

  const step = useCallback(
    (direction: 1 | -1) =>
      update((current) => ({
        positionIndex: (current.positionIndex + direction + positions.length) % positions.length,
      })),
    [update, positions.length],
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.isContentEditable)) return;
      switch (event.code) {
        case "Space":
          event.preventDefault();
          metronome.toggle();
          break;
        case "ArrowUp":
          event.preventDefault();
          setBpm(settings.bpm + 1);
          break;
        case "ArrowDown":
          event.preventDefault();
          setBpm(settings.bpm - 1);
          break;
        case "ArrowRight":
          step(1);
          break;
        case "ArrowLeft":
          step(-1);
          break;
        case "KeyZ":
          update({ zoom: settings.zoom === "position" ? "neck" : "position" });
          break;
        case "KeyD":
          update({ drone: !settings.drone });
          break;
        case "KeyM":
          update({ click: !settings.click });
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [metronome, setBpm, step, update, settings.bpm, settings.zoom, settings.drone, settings.click]);

  const selectPosition = useCallback(
    (index: number) =>
      update((current) => {
        // Keep a slide drill on two distinct shapes.
        if (current.advanceMode === "pair" && index === current.pairIndex) {
          return { positionIndex: index, pairIndex: current.positionIndex };
        }
        return { positionIndex: index };
      }),
    [update],
  );

  const playNote = useCallback((midi: number) => getAudioEngine().pluck(midi, 0.6), []);

  const shapeOptions = positions.map((entry, index) => ({
    value: index,
    label: `${entry.name}${entry.fret === 0 ? " (open)" : ` · ${entry.fret}`}`,
    title: entry.fret === 0 ? `${entry.name} shape at the nut` : `${entry.name} shape, index finger at fret ${entry.fret}`,
  }));

  return (
    <main
      className="mx-auto flex min-h-[100dvh] w-full max-w-[1400px] flex-col gap-3 px-[max(14px,env(safe-area-inset-left))] pb-[max(14px,env(safe-area-inset-bottom))] pt-[max(10px,env(safe-area-inset-top))]"
      style={{ visibility: hydrated ? "visible" : "hidden" }}
    >
      <header className="flex h-11 flex-none items-center justify-between gap-4">
        <h1 className="text-base font-medium tracking-tight">Position</h1>
        <p className="truncate font-mono text-xs text-bone-dim">
          {keyLabel(settings.root, settings.tonality)} {settings.scale.toLowerCase()} · {position.name} shape
          {position.fret === 0 ? " at the nut" : ` at fret ${position.fret}`}
        </p>
      </header>

      <div className="overflow-hidden rounded-2xl border border-board-edge bg-board px-1 py-1.5 [&_svg]:max-h-[42vh]">
        <Fretboard
          position={position}
          pair={pairPosition}
          root={settings.root}
          intervals={intervals}
          zoom={settings.zoom}
          labels={settings.labels}
          onPlayNote={playNote}
        />
      </div>

      <Transport
        playing={metronome.playing}
        onToggle={metronome.toggle}
        bpm={settings.bpm}
        onBpm={setBpm}
        beats={settings.beats}
        beat={metronome.beat}
        bar={metronome.bar}
      />

      <nav className="lg:hidden">
        <Segmented
          ariaLabel="Control group"
          value={tab}
          onChange={setTab}
          options={[
            { value: "shape", label: "Shape & scale" },
            { value: "drill", label: "Drill" },
            { value: "sound", label: "Sound" },
          ]}
        />
      </nav>

      <div className="grid flex-1 grid-cols-1 gap-3 lg:grid-cols-3">
        {/* Shape and scale */}
        <section className={`panel flex-col gap-4 ${tab === "shape" ? "flex" : "hidden"} lg:flex`}>
          <Field label="Key">
            <ChipGroup
              ariaLabel="Key"
              value={settings.root}
              onChange={(root) => update({ root, positionIndex: 0, pairIndex: 2 })}
              options={KEYS.map((name, index) => ({ value: index, label: name }))}
            />
          </Field>
          <div className="flex flex-wrap gap-4">
            <Field label="Tonality">
              <Segmented
                ariaLabel="Tonality"
                value={settings.tonality}
                onChange={(tonality) =>
                  update((current) => ({
                    tonality,
                    scale: scaleForTonality(current.scale, tonality),
                    positionIndex: 0,
                    pairIndex: 2,
                  }))
                }
                options={[
                  { value: "major", label: "Major" },
                  { value: "minor", label: "Minor" },
                ]}
              />
            </Field>
            <Field label="View">
              <Segmented
                ariaLabel="View"
                value={settings.zoom}
                onChange={(zoom) => update({ zoom })}
                options={[
                  { value: "position", label: "Position" },
                  { value: "neck", label: "Whole neck" },
                ]}
              />
            </Field>
            <Field label="Labels">
              <Segmented
                ariaLabel="Labels"
                value={settings.labels}
                onChange={(labels) => update({ labels })}
                options={[
                  { value: "degrees", label: "Degrees" },
                  { value: "notes", label: "Notes" },
                ]}
              />
            </Field>
          </div>
          <Field label="Shape">
            <ChipGroup ariaLabel="Shape" value={settings.positionIndex} onChange={selectPosition} options={shapeOptions} />
          </Field>
          <Field label="Scale">
            <ChipGroup
              ariaLabel="Scale"
              value={settings.scale}
              onChange={(scale) => update({ scale })}
              options={Object.keys(SCALES[settings.tonality]).map((name) => ({ value: name, label: name }))}
            />
          </Field>
        </section>

        {/* Drill */}
        <section className={`panel flex-col gap-4 ${tab === "drill" ? "flex" : "hidden"} lg:flex`}>
          <Field label="Beats per bar">
            <Segmented
              ariaLabel="Beats per bar"
              value={settings.beats}
              onChange={(beats) => update({ beats })}
              options={[2, 3, 4, 6].map((count) => ({ value: count, label: String(count) }))}
            />
          </Field>
          <Field label="Move shape every">
            <Segmented
              ariaLabel="Move shape every"
              value={settings.advanceBars}
              onChange={(advanceBars) => update({ advanceBars })}
              options={[
                { value: 0, label: "Off" },
                { value: 1, label: "1 bar" },
                { value: 2, label: "2 bars" },
                { value: 4, label: "4 bars" },
                { value: 8, label: "8 bars" },
              ]}
            />
          </Field>
          <Field label="Direction">
            <ChipGroup
              ariaLabel="Direction"
              value={settings.advanceMode}
              onChange={(advanceMode) =>
                update((current) => ({
                  advanceMode,
                  pairIndex:
                    current.pairIndex === current.positionIndex
                      ? (current.positionIndex + 2) % positions.length
                      : current.pairIndex,
                }))
              }
              options={ADVANCE_MODES}
            />
          </Field>
          {settings.advanceMode === "pair" ? (
            <Field label="Second shape">
              <ChipGroup
                ariaLabel="Second shape"
                value={settings.pairIndex}
                onChange={(pairIndex) =>
                  update((current) => ({
                    pairIndex,
                    positionIndex:
                      pairIndex === current.positionIndex ? (pairIndex + 1) % positions.length : current.positionIndex,
                  }))
                }
                options={shapeOptions}
              />
            </Field>
          ) : null}
          <p className="text-xs leading-relaxed text-bone-dim">
            {settings.advanceBars === 0
              ? "Shapes stay put. Turn this on to be moved between positions in time."
              : settings.advanceMode === "pair"
                ? `Sliding between the ${position.name} and ${pairPosition?.name} shapes every ${settings.advanceBars} ${settings.advanceBars === 1 ? "bar" : "bars"}. The dashed box is where you are going next.`
                : `Moving ${settings.advanceMode === "random" ? "to a random shape" : settings.advanceMode === "down" ? "down the neck" : "up the neck"} every ${settings.advanceBars} ${settings.advanceBars === 1 ? "bar" : "bars"}.`}
          </p>
        </section>

        {/* Sound */}
        <section className={`panel flex-col gap-4 ${tab === "sound" ? "flex" : "hidden"} lg:flex`}>
          <Field label="Metronome">
            <div className="flex flex-wrap items-center gap-2">
              <Toggle on={settings.click} onChange={(click) => update({ click })}>
                {settings.click ? "Click on" : "Click off"}
              </Toggle>
            </div>
          </Field>
          <Slider
            label="Click volume"
            value={Math.round(settings.clickVolume * 100)}
            min={0}
            max={100}
            onChange={(value) => update({ clickVolume: value / 100 })}
            display={`${Math.round(settings.clickVolume * 100)}%`}
          />
          <Field label="Drone">
            <div className="flex flex-wrap items-center gap-2">
              <Toggle on={settings.drone} onChange={(drone) => update({ drone })}>
                {settings.drone ? `${KEYS[settings.root]} drone on` : "Drone off"}
              </Toggle>
              <Toggle on={settings.droneFifth} onChange={(droneFifth) => update({ droneFifth })}>
                With fifth
              </Toggle>
            </div>
          </Field>
          <Field label="Drone octave">
            <Segmented
              ariaLabel="Drone octave"
              value={settings.droneOctave}
              onChange={(droneOctave) => update({ droneOctave })}
              options={[
                { value: -1, label: "Low" },
                { value: 0, label: "Mid" },
                { value: 1, label: "High" },
              ]}
            />
          </Field>
          <Slider
            label="Drone volume"
            value={Math.round(settings.droneVolume * 100)}
            min={0}
            max={100}
            onChange={(value) => update({ droneVolume: value / 100 })}
            display={`${Math.round(settings.droneVolume * 100)}%`}
          />
          <p className="text-xs leading-relaxed text-bone-dim">
            The drone holds the key centre under whatever you play, which is the quickest way to hear what each degree
            actually does. Tap any note on the neck to hear it against the drone.
          </p>
        </section>
      </div>

      <p className="text-xs leading-relaxed text-bone-dim">
        <b className="font-medium text-bone">
          {keyLabel(settings.root, settings.tonality)} {settings.scale.toLowerCase()}
        </b>{" "}
        around the <b className="font-medium text-bone">{position.name} shape</b>
        {position.fret === 0 ? " at the nut" : `, index finger at fret ${position.fret}`}. Filled dot is the root, thick
        ring is a chord tone you are already fretting, thin ring is the rest of the scale. Space starts the metronome,
        arrows change tempo and position.
      </p>
    </main>
  );
}
