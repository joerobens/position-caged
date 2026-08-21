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
import { deriveView } from "@/lib/view";

type Tab = "shape" | "drill" | "sound";

/** What each control is for, in the words you would use holding a guitar. */
const INFO = {
  key: "The key everything is built from. Fret numbers are positions on the neck, not sounding pitch, so if you are tuned down a whole step the shapes are identical and only the name changes.",
  tonality:
    "Major or minor. The five shapes keep the same geometry in minor: the thirds drop a semitone and the scale choices change with them.",
  view: "Position zooms to the shape you are on. Whole neck keeps the same notes but shows where the box sits on the full neck.",
  labels: "What goes inside each dot. Degrees are the interval from the root, which is what transfers between keys. Notes are the note names.",
  shape:
    "The five CAGED shapes, ordered up the neck and named for the open chord each one comes from. All shows every shape at once, each in its own colour, so you can see how they interlock and where they share notes.",
  scale:
    "The scale drawn around the shape. Turn it off to leave just the chord tones, which is how you check you actually know where the 1, 3 and 5 are rather than running a pattern.",
  beats: "Beats per bar. Sets how many pips the metronome counts before the accent comes round again.",
  advance:
    "How often the metronome moves you to another shape. The change lands on the downbeat, so you have the bar line to make the move.",
  direction:
    "Where the next shape comes from. Up and down walk the neck in order, random stops you anticipating, and two shapes turns it into a slide drill between a pair you pick.",
  pair: "The other half of the slide drill. It shows on the neck as a dashed box, so you can see where you are going before you get there.",
  click: "The click itself. Turning it off leaves the pips and the shape changes running silently, which is what you want over a backing track.",
  drone:
    "A sustained root under whatever you play, optionally with the fifth. It is the quickest way to hear what each degree actually does against the key, rather than taking it on trust.",
  droneOctave: "Where the drone sits. Low stays under the guitar, high cuts through it. Mid is usually the one that disappears into the background.",
} as const;

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
  const view = deriveView(settings);

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
          return { positionIndex: index, pairIndex: current.positionIndex, allShapes: false };
        }
        return { positionIndex: index, allShapes: false };
      }),
    [update],
  );

  const playNote = useCallback((midi: number) => getAudioEngine().pluck(midi, 0.6), []);

  const shapeOptions = positions.map((entry, index) => ({
    value: index,
    label: `${entry.name}${entry.fret === 0 ? " (open)" : ` · ${entry.fret}`}`,
    title: entry.fret === 0 ? `${entry.name} shape at the nut` : `${entry.name} shape, index finger at fret ${entry.fret}`,
  }));
  // "All" sits alongside the five, because seeing them at once is a way of looking
  // at the neck rather than a separate mode.
  const shapeChoices = [
    { value: "all", label: "All", title: "Every shape at once, colour coded, across the whole neck" },
    ...shapeOptions.map((option) => ({ ...option, value: String(option.value) })),
  ];

  return (
    <main
      className="mx-auto flex min-h-[100dvh] w-full max-w-[1400px] flex-col gap-3 px-[max(14px,env(safe-area-inset-left))] pb-[max(14px,env(safe-area-inset-bottom))] pt-[max(10px,env(safe-area-inset-top))]"
      style={{ visibility: hydrated ? "visible" : "hidden" }}
    >
      <header className="flex h-11 flex-none items-center justify-between gap-4">
        <h1 className="text-base font-medium tracking-tight">Position</h1>
        <p className="truncate font-mono text-xs text-bone-dim">
          {keyLabel(settings.root, settings.tonality)}
          {view.scaleDrawn ? ` ${settings.scale.toLowerCase()}` : ""} ·{" "}
          {view.allShapes
            ? `all five shapes, ${position.name} highlighted`
            : `${position.name} shape${position.fret === 0 ? " at the nut" : ` at fret ${position.fret}`}`}
        </p>
      </header>

      <div className="overflow-hidden rounded-2xl border border-board-edge bg-board px-1 py-1.5 [&_svg]:max-h-[42vh]">
        <Fretboard
          position={position}
          positions={positions}
          pair={view.pairDrawn ? pairPosition : null}
          root={settings.root}
          tonality={settings.tonality}
          intervals={intervals}
          zoom={view.zoom}
          labels={settings.labels}
          allShapes={view.allShapes}
          showScale={view.scaleDrawn}
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
          <Field label="Key" info={INFO.key}>
            <ChipGroup
              ariaLabel="Key"
              value={settings.root}
              onChange={(root) => update({ root, positionIndex: 0, pairIndex: 2 })}
              options={KEYS.map((name, index) => ({ value: index, label: name }))}
            />
          </Field>
          <div className="flex flex-wrap gap-4">
            <Field label="Tonality" info={INFO.tonality}>
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
            {view.zoomAvailable ? (
              <Field label="View" info={INFO.view}>
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
            ) : null}
            <Field label="Labels" info={INFO.labels}>
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
          <Field label="Shape" info={INFO.shape}>
            <ChipGroup
              ariaLabel="Shape"
              value={settings.allShapes ? "all" : String(settings.positionIndex)}
              onChange={(value) => (value === "all" ? update({ allShapes: true }) : selectPosition(Number(value)))}
              options={shapeChoices}
            />
          </Field>
          {view.scaleAvailable ? (
            <Field
              label="Scale"
              info={INFO.scale}
              action={
                <button
                  type="button"
                  className="chip chip-sm"
                  aria-pressed={settings.showScale}
                  onClick={() => update({ showScale: !settings.showScale })}
                >
                  {settings.showScale ? "Shown" : "Hidden"}
                </button>
              }
            >
              {settings.showScale ? (
                <ChipGroup
                  ariaLabel="Scale"
                  value={settings.scale}
                  onChange={(scale) => update({ scale })}
                  options={Object.keys(SCALES[settings.tonality]).map((name) => ({ value: name, label: name }))}
                />
              ) : (
                <p className="text-[13px] leading-relaxed text-bone-dim">
                  Chord tones only: the notes the shape is holding down, and nothing else.
                </p>
              )}
            </Field>
          ) : null}
          {view.note ? (
            <p className="rounded-xl border border-line bg-ink/40 p-3 text-[13px] leading-relaxed text-bone-dim">
              {view.note}
            </p>
          ) : null}
        </section>

        {/* Drill */}
        <section className={`panel flex-col gap-4 ${tab === "drill" ? "flex" : "hidden"} lg:flex`}>
          <Field label="Beats per bar" info={INFO.beats}>
            <Segmented
              ariaLabel="Beats per bar"
              value={settings.beats}
              onChange={(beats) => update({ beats })}
              options={[2, 3, 4, 6].map((count) => ({ value: count, label: String(count) }))}
            />
          </Field>
          <Field label="Move shape every" info={INFO.advance}>
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
          <Field label="Direction" info={INFO.direction}>
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
            <Field label="Second shape" info={INFO.pair}>
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
          <p className="text-[13px] leading-relaxed text-bone-dim">
            {settings.advanceBars === 0
              ? "Shapes stay put. Turn this on to be moved between positions in time."
              : settings.advanceMode === "pair"
                ? `Sliding between the ${position.name} and ${pairPosition?.name} shapes every ${settings.advanceBars} ${settings.advanceBars === 1 ? "bar" : "bars"}. ${view.pairDrawn ? "The dashed box is where you are going next." : "The highlight moves between the two."}`
                : `Moving ${settings.advanceMode === "random" ? "to a random shape" : settings.advanceMode === "down" ? "down the neck" : "up the neck"} every ${settings.advanceBars} ${settings.advanceBars === 1 ? "bar" : "bars"}.`}
          </p>
        </section>

        {/* Sound */}
        <section className={`panel flex-col gap-4 ${tab === "sound" ? "flex" : "hidden"} lg:flex`}>
          <Field label="Metronome" info={INFO.click}>
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
          <Field label="Drone" info={INFO.drone}>
            <div className="flex flex-wrap items-center gap-2">
              <Toggle on={settings.drone} onChange={(drone) => update({ drone })}>
                {settings.drone ? `${KEYS[settings.root]} drone on` : "Drone off"}
              </Toggle>
              <Toggle on={settings.droneFifth} onChange={(droneFifth) => update({ droneFifth })}>
                With fifth
              </Toggle>
            </div>
          </Field>
          <Field label="Drone octave" info={INFO.droneOctave}>
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
          <p className="text-[13px] leading-relaxed text-bone-dim">
            The drone holds the key centre under whatever you play, which is the quickest way to hear what each degree
            actually does. Tap any note on the neck to hear it against the drone.
          </p>
        </section>
      </div>

      <p className="text-[13px] leading-relaxed text-bone-dim">
        {view.allShapes ? (
          <>
            <b className="font-medium text-bone">
              {keyLabel(settings.root, settings.tonality)} chord tones across the whole neck
            </b>
            . Each dot takes the colour of the shape that frets it, and the bars under the neck show where each shape
            sits. A dot split between two colours belongs to both shapes at once, which is the seam you slide across.
            Faint dots are chord tones no shape frets. Space starts the metronome, arrows change tempo and position.
          </>
        ) : (
          <>
            <b className="font-medium text-bone">
              {keyLabel(settings.root, settings.tonality)}
              {view.scaleDrawn ? ` ${settings.scale.toLowerCase()}` : " chord tones"}
            </b>{" "}
            around the <b className="font-medium text-bone">{position.name} shape</b>
            {position.fret === 0 ? " at the nut" : `, index finger at fret ${position.fret}`}. Filled dot is the root,
            thick ring is a chord tone you are already fretting
            {view.scaleDrawn ? ", thin ring is the rest of the scale" : ""}. Space starts the metronome, arrows
            change tempo and position.
          </>
        )}
      </p>
    </main>
  );
}
