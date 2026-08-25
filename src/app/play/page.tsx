"use client";

import { useCallback, useEffect, useMemo } from "react";
import Fretboard from "@/components/Fretboard";
import KeyBar from "@/components/KeyBar";
import SiteNav from "@/components/SiteNav";
import CycleStrip from "@/components/CycleStrip";
import BarStrip from "@/components/BarStrip";
import TechniqueNote from "@/components/TechniqueNote";
import Transport, { MAX_BPM, MIN_BPM } from "@/components/Transport";
import { ChipGroup, Field, Segmented, Slider, Toggle } from "@/components/controls";
import { useMetronome } from "@/hooks/useMetronome";
import { useSettings } from "@/hooks/useSettings";
import { useAudioReady } from "@/hooks/useAudioReady";
import { getAudioEngine } from "@/lib/audio";
import { BOX_MODES, SPIDER_PATTERNS, drillsFor, spiderSequence, spiderStepAt, type BoxMode, type Drill } from "@/lib/drills";
import { FRET_COUNT, KEYS, SCALES, buildPositions, keyLabel } from "@/lib/music";
import { scaleForTonality, type AdvanceMode, type Mode, type Settings, type System } from "@/lib/settings";
import { PROGRESSIONS, chordAt, nearestPosition, type Progression } from "@/lib/progressions";
import { LANDMARKS, PENT_SHAPES, relativeMajor, relativeMinor, type PentShape } from "@/lib/pentatonic";
import { deriveView } from "@/lib/view";
import { paletteFor } from "@/lib/theme";
import { useTheme } from "@/hooks/useTheme";

const ADVANCE_MODES: { value: AdvanceMode; label: string; title: string }[] = [
  { value: "up", label: "Up the neck", title: "Step to the next shape toward the body" },
  { value: "down", label: "Down", title: "Step to the next shape toward the nut" },
  { value: "random", label: "Random", title: "Jump to any other shape" },
];

/** What each control is for, in the words you would use holding a guitar. */
const INFO = {
  key: "The key everything is built from. Fret numbers are positions on the neck, not sounding pitch, so if you are tuned down a whole step the shapes are identical and only the name changes.",
  tonality:
    "Major or minor. The five shapes keep the same geometry in minor: the thirds drop a semitone and the scale choices change with them.",
  view: "Position zooms to the shape you are on. Whole neck keeps the same notes but shows where the box sits on the full neck.",
  labels: "What goes inside each dot. Degrees are the interval from the root, which is what transfers between keys; notes are the note names. None is the useful one: with the numbers gone you find out whether you know the shape or have been reading it.",
  shape:
    "The five CAGED shapes, ordered up the neck and named for the open chord each one comes from. All shows every shape at once, each in its own colour. Roots strips it back to the root notes and the octave links between them, which is the map underneath everything else.",
  scale:
    "The scale drawn around the shape. Turn it off to leave just the chord tones, which is how you check you actually know where the 1, 3 and 5 are rather than running a pattern.",
  pentShape:
    "The pentatonic as five numbered boxes rather than through the CAGED shapes. Shapes one and four are the landmarks, marked with a dot: one has its root under your index finger on the low E, the other on the A string. Learn those two and the other three are filler.",
  boxMode:
    "Where the drill sends you next. Up the neck walks the five boxes in order; landmarks only bounces between shapes one and four, which is the pair worth owning.",
  run: "The diagonal extension. Start two frets below the box, play the notes in pairs, and slide at the end of each pair. It is the same five notes climbing through three octaves, and it lands you exactly where the next landmark begins.",
  region: "Where you are standing on the neck. Following changes this does not pick a chord, it picks the patch of neck you play in, and each chord's nearest shape is brought to you there.",
  changes: "Follow the chords instead of sitting on one. The shape chips still pick the region you play in, and each chord comes to you there. Degrees count from the chord you are on, so the third is always marked 3, whichever chord it belongs to.",
  progression: "Which form to walk. The twelve bar blues is the one you will hear; quick change borrows the IV early, in bar two.",
  drill: "What the clock is drilling. The shape drills move you around the neck; the spider walk is a finger exercise and takes the neck over while it runs.",
  beats: "Beats per bar. Sets how many pips the metronome counts before the accent comes round again.",
  advance:
    "How often the metronome moves you to another shape. The change lands on the downbeat, so you have the bar line to make the move.",
  direction: "Where the next shape comes from. Up and down walk the neck in order; random stops you anticipating it.",
  pair: "The other half of the slide drill. It shows on the neck as a dashed box, so you can see where you are going before you get there.",
  tap: "Every dot on the neck is playable. Tap one to hear it, which is worth doing with the drone on: that is how a degree stops being a number and starts being a sound.",
  click: "The click itself. Turning it off leaves the pips and the shape changes running silently, which is what you want over a backing track.",
  spiderStart: "The fret the index finger starts on. The exercise covers four frets from there, one per finger.",
  spiderPattern:
    "The order the fingers go in. 1-2-3-4 is the plain walk; the others break up the order, which is harder and better for independence.",
  spiderShape:
    "Both directions plays up the strings and back down. Shift up moves the whole box a fret at the end of each pass and keeps climbing.",
} as const;

/** Where the next move lands, whichever thing is moving. */
function advancePatch(settings: Settings, count: number): Partial<Settings> {
  // The pentatonic drill moves you between boxes rather than chord shapes.
  if (settings.drill === "boxes") {
    const order: PentShape[] = settings.boxMode === "landmarks" ? [...LANDMARKS] : [...PENT_SHAPES];
    if (settings.boxMode === "random") {
      if (order.length < 2) return {};
      let next = settings.pentShape;
      while (next === settings.pentShape) next = order[Math.floor(Math.random() * order.length)];
      return { pentShape: next };
    }
    const at = order.indexOf(settings.pentShape);
    return { pentShape: order[(at + 1 + order.length) % order.length] };
  }
  if (settings.drill === "slide") {
    return { positionIndex: settings.pairIndex, pairIndex: settings.positionIndex };
  }
  switch (settings.advanceMode) {
    case "down":
      return { positionIndex: (settings.positionIndex - 1 + count) % count };
    case "random": {
      if (count < 2) return {};
      let next = settings.positionIndex;
      while (next === settings.positionIndex) next = Math.floor(Math.random() * count);
      return { positionIndex: next };
    }
    default:
      return { positionIndex: (settings.positionIndex + 1) % count };
  }
}

function isMode(value: string | null): value is Mode {
  return value === "learn" || value === "drill" || value === "technique";
}
function isSystem(value: string | null): value is System {
  return value === "neck" || value === "chords" || value === "scales" || value === "blues";
}

const MODES: { value: Mode; label: string; title: string }[] = [
  { value: "learn", label: "Learn", title: "Explore it. No clock." },
  { value: "drill", label: "Drill", title: "Cement it, against the metronome." },
  { value: "technique", label: "Technique", title: "Dexterity. No theory at all." },
];

/** Neck has nothing to drill yet, so it is not offered as one. */
const SYSTEMS: { value: System; label: string; title: string; drillable: boolean }[] = [
  { value: "neck", label: "Neck", title: "Roots, octaves and note names", drillable: false },
  { value: "chords", label: "Chords", title: "CAGED: the five shapes", drillable: true },
  { value: "scales", label: "Scales", title: "Pentatonic boxes and the runs between them", drillable: true },
  { value: "blues", label: "Blues", title: "Following the chords, targeting the third", drillable: true },
];

export default function Page() {
  const { settings, update, hydrated } = useSettings();

  const positions = useMemo(() => buildPositions(settings.root, settings.tonality), [settings.root, settings.tonality]);
  const anchor = positions[Math.min(settings.positionIndex, positions.length - 1)];
  const pairPosition = positions[Math.min(settings.pairIndex, positions.length - 1)];
  const intervals = SCALES[settings.tonality][settings.scale] ?? Object.values(SCALES[settings.tonality])[0];
  const view = deriveView(settings);
  const progression: Progression = useMemo(() => {
    if (settings.progression === "custom" && settings.customBars) {
      const bars = settings.customBars
        .split(",")
        .map(Number)
        .filter((value) => Number.isFinite(value));
      if (bars.length) {
        return {
          id: "custom",
          name: "From a song",
          blurb: "The chart handed over from a song page. Change the key on the song and this follows it.",
          bars,
          perLine: bars.length % 4 === 0 ? 4 : Math.min(bars.length, 3),
        };
      }
    }
    return PROGRESSIONS.find((entry) => entry.id === settings.progression) ?? PROGRESSIONS[0];
  }, [settings.progression, settings.customBars]);
  const resolvedTheme = useTheme(settings.theme);
  const audioReady = useAudioReady();
  const palette = paletteFor(resolvedTheme);

  // The mode lives in the URL as well as in storage, so the iPad can hold a home
  // screen icon for each one and the back button does what it looks like it does.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get("mode");
    const patch: Partial<Settings> = {};
    if (isMode(fromUrl)) patch.mode = fromUrl;

    // A song page links straight in with its key, its form and the drill already on.
    const key = Number(params.get("key"));
    if (Number.isInteger(key) && key >= 0 && key < 12) {
      patch.root = key;
      patch.positionIndex = 0;
      patch.pairIndex = 2;
    }
    const tonality = params.get("tonality");
    if (tonality === "major" || tonality === "minor") patch.tonality = tonality;
    const system = params.get("system");
    if (isSystem(system)) patch.system = system;
    const drill = params.get("drill");
    if (drill === "caged" || drill === "slide" || drill === "boxes" || drill === "changes") patch.drill = drill;
    if (drill === "spider") patch.mode = "technique";
    const bars = params.get("bars");
    if (bars && /^[\d,]+$/.test(bars)) {
      patch.progression = "custom";
      patch.customBars = bars;
      patch.chordBar = 0;
      patch.system = "blues";
      if (!patch.mode) patch.mode = "drill";
    }
    if (Object.keys(patch).length) update(patch);
    const onPop = () => {
      const mode = new URLSearchParams(window.location.search).get("mode");
      if (isMode(mode)) update({ mode });
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [update]);

  const setMode = useCallback(
    (mode: Mode) => {
      update({ mode });
      const url = new URL(window.location.href);
      url.searchParams.set("mode", mode);
      window.history.pushState({}, "", url);
    },
    [update],
  );

  const advance = useCallback(() => {
    update((current) => advancePatch(current, positions.length));
  }, [update, positions.length]);

  const metronome = useMetronome({
    bpm: settings.bpm,
    beats: settings.beats,
    click: settings.click,
    volume: settings.clickVolume,
    advanceBars: view.advanceBars,
    onAdvance: advance,
  });

  const spiderSteps = useMemo(
    () =>
      spiderSequence({
        startFret: settings.spiderStartFret,
        pattern: settings.spiderPattern,
        both: settings.spiderBoth,
        shift: settings.spiderShift,
      }),
    [settings.spiderStartFret, settings.spiderPattern, settings.spiderBoth, settings.spiderShift],
  );
  const spider = view.spiderDrawn ? { steps: spiderSteps, index: spiderStepAt(spiderSteps, metronome.pulse) } : null;

  // The clock owns the form while it is running. Off the clock you step it yourself.
  const activeBar = metronome.playing && settings.mode === "drill" ? metronome.bar : settings.chordBar;
  const chord = view.changesDrawn ? chordAt(progression, settings.root, activeBar) : null;
  // Following changes, the neck shows the chord's own shape nearest where you are.
  const position = chord ? nearestPosition(chord.root, settings.tonality, anchor.fret) : anchor;

  // The accent follows the shape, so the whole interface tells you where you are.
  const accent = palette.shapes[position.name];
  useEffect(() => {
    document.documentElement.style.setProperty("--accent", accent);
    document.documentElement.style.setProperty("--fb-dim", palette.dim);
  }, [accent, palette.dim]);


  // Drone. Retunes rather than restarting, so changing key mid-practice does not click.
  useEffect(() => {
    const engine = getAudioEngine();
    if (!settings.drone) {
      engine.stopDrone();
      return;
    }
    // Nothing can sound until a gesture has opened the context on iOS.
    if (!audioReady) return;
    engine.setDrone({
      pitchClass: settings.root,
      octave: settings.droneOctave,
      volume: settings.droneVolume,
      fifth: settings.droneFifth,
    });
  }, [audioReady, settings.drone, settings.root, settings.droneOctave, settings.droneVolume, settings.droneFifth]);

  useEffect(() => () => getAudioEngine().stopDrone(), []);

  const setBpm = useCallback(
    (value: number) => update({ bpm: Math.min(MAX_BPM, Math.max(MIN_BPM, Math.round(value))) }),
    [update],
  );

  const step = useCallback(
    (direction: 1 | -1) =>
      update((current) => ({
        positionIndex: (current.positionIndex + direction + positions.length) % positions.length,
        allShapes: false,
        rootMap: false,
      })),
    [update, positions.length],
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.isContentEditable)) return;
      switch (event.code) {
        case "Space":
          // The transport exists where there is a clock, so space belongs there.
          if (settings.mode === "learn") return;
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
        case "KeyL":
          setMode("learn");
          break;
        case "KeyD":
          setMode("drill");
          break;
        case "KeyT":
          setMode("technique");
          break;
        case "KeyO":
          update({ drone: !settings.drone });
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [metronome, setBpm, step, setMode, update, settings.bpm, settings.mode, settings.drone]);

  const selectPosition = useCallback(
    (index: number) =>
      update((current) => {
        if (current.drill === "slide" && index === current.pairIndex) {
          return { positionIndex: index, pairIndex: current.positionIndex, allShapes: false, rootMap: false };
        }
        return { positionIndex: index, allShapes: false, rootMap: false };
      }),
    [update],
  );

  const playNote = useCallback((midi: number) => getAudioEngine().pluck(midi, 0.6), []);

  // Only CAGED positions live in this row now. Roots and pentatonic became systems.
  const shapeOptions = positions.map((entry, index) => ({
    value: String(index),
    label: `${entry.name}${entry.fret === 0 ? " (open)" : ` · ${entry.fret}`}`,
    title: entry.fret === 0 ? `${entry.name} shape at the nut` : `${entry.name} shape, index finger at fret ${entry.fret}`,
  }));
  const pairOptions = positions.map((entry, index) => ({
    value: index,
    label: `${entry.name}${entry.fret === 0 ? " (open)" : ` · ${entry.fret}`}`,
  }));

  const statusLine = view.spiderDrawn
    ? `technique · spider walk · ${settings.spiderPattern}`
    : view.landmarkDrawn
      ? // Named for the key you are in, not for whichever name the boxes happen to
        // be built from. Picking C major and being told A minor is a small lie.
        `${KEYS[settings.root]} ${settings.tonality} pentatonic · ${
          settings.pentLandmarks ? "both landmarks" : `box ${settings.pentShape}`
        }`
      : chord
        ? `${keyLabel(settings.root, settings.tonality)} · bar ${(activeBar % progression.bars.length) + 1} · ${chord.name} (${chord.roman})`
        : view.rootMapDrawn
          ? `every ${KEYS[settings.root]} on the neck`
          : `${keyLabel(settings.root, settings.tonality)}${view.scaleDrawn ? ` ${settings.scale.toLowerCase()}` : ""} · ${
              view.allShapes
                ? `all five shapes, ${position.name} highlighted`
                : `${position.name} shape${position.fret === 0 ? " at the nut" : ` at fret ${position.fret}`}`
            }`;

  const available = drillsFor(
    settings.mode === "technique" ? "technique" : (view.system as "chords" | "scales" | "blues"),
  );
  const drill = available.find((entry) => entry.id === settings.drill) ?? available[0];
  // Switching system in Drill lands you on a drill that system actually has.
  useEffect(() => {
    if (settings.mode !== "technique" && drill && settings.drill !== drill.id) update({ drill: drill.id });
  }, [settings.mode, settings.drill, drill, update]);

  return (
    <>
      <SiteNav sticky={false} />
      <main
        className="mx-auto flex min-h-[100dvh] w-full max-w-[1400px] flex-col gap-2 px-[var(--gutter)] pb-[max(14px,env(safe-area-inset-bottom))] sm:gap-3"
        style={{ visibility: hydrated ? "visible" : "hidden" }}
      >
        <div className="sticky top-0 z-20 -mx-[var(--gutter)] flex flex-col gap-2 bg-ink px-[var(--gutter)] pb-2 pt-[max(8px,env(safe-area-inset-top))]">
          <header className="hidden h-9 flex-none items-center justify-end gap-4 sm:flex">
            <p className="truncate font-mono text-xs text-bone-dim">{statusLine}</p>
          </header>
          <div className="neck-frame relative">
            <span className="pointer-events-none absolute right-3 top-2.5 z-10 font-mono text-[10px] uppercase tracking-[0.09em] text-bone-dim opacity-70">
              tap a note to hear it
            </span>
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
              rootMap={view.rootMapDrawn}
              landmark={
                view.landmarkDrawn
                  ? {
                      shape: settings.pentLandmarks ? ("landmarks" as const) : settings.pentShape,
                      minorRoot: settings.tonality === "minor" ? settings.root : relativeMinor(settings.root),
                      showRun: settings.showRun,
                    }
                  : null
              }
              showScale={view.scaleDrawn}
              spider={spider}
              palette={palette}
              chord={chord}
              onPlayNote={playNote}
            />
          </div>
        </div>

        <KeyBar
          root={settings.root}
          tonality={settings.tonality}
          drone={settings.drone}
          droneFifth={settings.droneFifth}
          droneOctave={settings.droneOctave}
          droneVolume={settings.droneVolume}
          theme={settings.theme}
          onChange={update}
        />

        {/* What am I doing, and what am I working on. Two questions, in that order. */}
        <nav aria-label="Mode and system" className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Segmented
            ariaLabel="Mode"
            value={settings.mode}
            onChange={setMode}
            options={MODES.map((entry) => ({ value: entry.value, label: entry.label, title: entry.title }))}
          />
          {settings.mode === "technique" ? (
            <span className="text-[13px] text-bone-dim sm:ml-2">
              Dexterity. No key, no shapes, nothing musical.
            </span>
          ) : (
            <ChipGroup
              ariaLabel="System"
              value={settings.system}
              onChange={(system: System) => update({ system })}
              options={SYSTEMS.filter((entry) => settings.mode === "learn" || entry.drillable).map((entry) => ({
                value: entry.value,
                label: entry.label,
                title: entry.title,
              }))}
            />
          )}
        </nav>

        {settings.mode === "learn" ? (
          <section aria-label="Learn" className="grid flex-1 grid-cols-1 gap-3 lg:grid-cols-2">
            <div className="panel flex flex-col gap-4">
              <Field label="Key" info={INFO.key}>
                <ChipGroup
                  ariaLabel="Key"
                  value={settings.root}
                  onChange={(root) => update({ root, positionIndex: 0, pairIndex: 2 })}
                  options={KEYS.map((name, index) => ({ value: index, label: name }))}
                />
              </Field>
              <div className="field-row">
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
                      { value: "none", label: "None" },
                    ]}
                  />
                </Field>
              </div>
            </div>

            <div className="panel flex flex-col gap-4">
              {/* Each system brings only its own controls. */}
              {view.chordsDrawn ? (
                <>
                  <Field label="Shape" info={INFO.shape}>
                    <ChipGroup
                      ariaLabel="Shape"
                      value={settings.allShapes ? "all" : String(settings.positionIndex)}
                      onChange={(value) =>
                        value === "all" ? update({ allShapes: true }) : selectPosition(Number(value))
                      }
                      options={[
                        { value: "all", label: "All five", title: "Every shape at once, colour coded" },
                        ...shapeOptions,
                      ]}
                    />
                    {!view.allShapes ? (
                      <CycleStrip positions={positions} current={position.name} palette={palette} />
                    ) : null}
                  </Field>
                  {view.scaleAvailable ? (
                    <Field
                      label="Scale over the top"
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
                </>
              ) : null}

              {view.landmarkDrawn ? (
                <>
                  <Field label="Box" info={INFO.pentShape}>
                    <ChipGroup
                      ariaLabel="Box"
                      value={settings.pentLandmarks ? "landmarks" : String(settings.pentShape)}
                      onChange={(value) =>
                        value === "landmarks"
                          ? update({ pentLandmarks: true })
                          : update({ pentLandmarks: false, pentShape: Number(value) as PentShape })
                      }
                      options={[
                        {
                          value: "landmarks",
                          label: "Both landmarks",
                          title: "Shapes one and four, everywhere they fall on the neck",
                        },
                        ...PENT_SHAPES.map((shape) => ({
                          value: String(shape),
                          // Named, not just dotted: a mark alone is not enough to carry it.
                          label: LANDMARKS.includes(shape) ? `${shape} · landmark` : String(shape),
                          title: LANDMARKS.includes(shape) ? `Shape ${shape}, a landmark` : `Shape ${shape}`,
                        })),
                      ]}
                    />
                  </Field>
                  {settings.pentLandmarks ? (
                    <p className="text-[13px] leading-relaxed text-bone-dim">
                      Shape one in one colour, shape four in the other, wherever each falls. Two safe places to aim for
                      rather than five boxes to memorise. Pick a single box to see its diagonal run.
                    </p>
                  ) : (
                    <Field label="Diagonal run" info={INFO.run}>
                      <Toggle on={settings.showRun} onChange={(showRun) => update({ showRun })}>
                        {settings.showRun ? "Shown" : "Hidden"}
                      </Toggle>
                    </Field>
                  )}
                </>
              ) : null}

              {view.changesDrawn ? (
                <>
                  <Field label="Progression" info={INFO.progression}>
                    <ChipGroup
                      ariaLabel="Progression"
                      value={settings.progression}
                      onChange={(value) => update({ progression: value, chordBar: 0 })}
                      options={PROGRESSIONS.map((entry) => ({ value: entry.id, label: entry.name }))}
                    />
                  </Field>
                  <BarStrip
                    progression={progression}
                    keyRoot={settings.root}
                    bar={settings.chordBar}
                    palette={palette}
                    onSelect={(value) => update({ chordBar: value })}
                  />
                  <Field label="Region" info={INFO.region}>
                    <ChipGroup
                      ariaLabel="Region"
                      value={String(settings.positionIndex)}
                      onChange={(value) => selectPosition(Number(value))}
                      options={positions.map((entry, index) => ({
                        value: String(index),
                        label: entry.fret === 0 ? "Nut" : `Fret ${entry.fret}`,
                        title: `Play around fret ${entry.fret}`,
                      }))}
                    />
                  </Field>
                  <TechniqueNote />
                </>
              ) : null}

              {view.note ? (
                <p className="rounded-xl border border-line bg-ink/40 p-3 text-[13px] leading-relaxed text-bone-dim">
                  {view.note}
                </p>
              ) : null}
            </div>
          </section>
        ) : (
          <section aria-label={settings.mode === "technique" ? "Technique" : "Drill"} className="flex flex-1 flex-col gap-3">
            <Transport
              playing={metronome.playing}
              onToggle={metronome.toggle}
              bpm={settings.bpm}
              onBpm={setBpm}
              beats={settings.beats}
              beat={metronome.beat}
              bar={metronome.bar}
            />

            <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
              <div className="panel flex flex-col gap-4">
                <Field label={settings.mode === "technique" ? "Exercise" : "Drill"} info={INFO.drill}>
                  <ChipGroup
                    ariaLabel="Drill"
                    value={settings.drill}
                    onChange={(value: Drill) => update({ drill: value })}
                    options={available.map((entry) => ({ value: entry.id, label: entry.name }))}
                  />
                </Field>
                <p className="text-[13px] leading-relaxed text-bone-dim">{drill?.blurb}</p>
              </div>

              <div className="panel flex flex-col gap-4">
                {settings.drill === "spider" ? (
                  <>
                    <Field label="Start fret" info={INFO.spiderStart}>
                      <Slider
                        label="Start fret"
                        value={settings.spiderStartFret}
                        min={1}
                        max={FRET_COUNT - 3}
                        onChange={(value) => update({ spiderStartFret: value })}
                        display={`fret ${settings.spiderStartFret}`}
                      />
                    </Field>
                    <Field label="Finger order" info={INFO.spiderPattern}>
                      <ChipGroup
                        ariaLabel="Finger order"
                        value={settings.spiderPattern}
                        onChange={(spiderPattern) => update({ spiderPattern })}
                        options={SPIDER_PATTERNS.map((name) => ({ value: name, label: name }))}
                      />
                    </Field>
                    <Field label="Shape of the pass" info={INFO.spiderShape}>
                      <div className="flex flex-wrap gap-2">
                        <Toggle on={settings.spiderBoth} onChange={(spiderBoth) => update({ spiderBoth })}>
                          Both directions
                        </Toggle>
                        <Toggle on={settings.spiderShift} onChange={(spiderShift) => update({ spiderShift })}>
                          Shift up a fret
                        </Toggle>
                      </div>
                    </Field>
                  </>
                ) : settings.drill === "changes" ? (
                  <>
                    <Field label="Progression" info={INFO.progression}>
                      <ChipGroup
                        ariaLabel="Progression"
                        value={settings.progression}
                        onChange={(value) => update({ progression: value, chordBar: 0 })}
                        options={PROGRESSIONS.map((entry) => ({ value: entry.id, label: entry.name }))}
                      />
                    </Field>
                    <BarStrip
                      progression={progression}
                      keyRoot={settings.root}
                      bar={activeBar}
                      palette={palette}
                      onSelect={metronome.playing ? undefined : (value) => update({ chordBar: value })}
                    />
                    <p className="text-[13px] leading-relaxed text-bone-dim">
                      {metronome.playing
                        ? `Bar ${(activeBar % progression.bars.length) + 1} of ${progression.bars.length}. Stay where you are and let the chords come to you.`
                        : "Press play and the form walks itself, a bar at a time."}
                    </p>
                  </>
                ) : settings.drill === "boxes" ? (
                  <>
                    <Field label="Move every" info={INFO.advance}>
                      <Segmented
                        ariaLabel="Move every"
                        value={settings.advanceBars}
                        onChange={(advanceBars) => update({ advanceBars })}
                        options={[0, 1, 2, 4, 8].map((count) => ({
                          value: count,
                          label: count === 0 ? "Off" : `${count} bar${count === 1 ? "" : "s"}`,
                        }))}
                      />
                    </Field>
                    <Field label="Where next" info={INFO.boxMode}>
                      <ChipGroup
                        ariaLabel="Where next"
                        value={settings.boxMode}
                        onChange={(boxMode: BoxMode) => update({ boxMode })}
                        options={BOX_MODES}
                      />
                    </Field>
                    <Field label="Diagonal run" info={INFO.run}>
                      <Toggle on={settings.showRun} onChange={(showRun) => update({ showRun })}>
                        {settings.showRun ? "Shown" : "Hidden"}
                      </Toggle>
                    </Field>
                  </>
                ) : (
                  <>
                    <Field label="Move every" info={INFO.advance}>
                      <Segmented
                        ariaLabel="Move every"
                        value={settings.advanceBars}
                        onChange={(advanceBars) => update({ advanceBars })}
                        options={[0, 1, 2, 4, 8].map((count) => ({
                          value: count,
                          label: count === 0 ? "Off" : `${count} bar${count === 1 ? "" : "s"}`,
                        }))}
                      />
                    </Field>
                    {settings.drill === "caged" ? (
                      <Field label="Direction" info={INFO.direction}>
                        <ChipGroup
                          ariaLabel="Direction"
                          value={settings.advanceMode}
                          onChange={(advanceMode) => update({ advanceMode })}
                          options={ADVANCE_MODES}
                        />
                      </Field>
                    ) : (
                      <Field label="Second shape" info={INFO.pair}>
                        <ChipGroup
                          ariaLabel="Second shape"
                          value={settings.pairIndex}
                          onChange={(pairIndex) =>
                            update((current) => ({
                              pairIndex,
                              positionIndex:
                                pairIndex === current.positionIndex
                                  ? (pairIndex + 1) % positions.length
                                  : current.positionIndex,
                            }))
                          }
                          options={pairOptions}
                        />
                      </Field>
                    )}
                  </>
                )}
              </div>

              <div className="panel flex flex-col gap-4">
                <Field label="Beats per bar" info={INFO.beats}>
                  <Segmented
                    ariaLabel="Beats per bar"
                    value={settings.beats}
                    onChange={(beats) => update({ beats })}
                    options={[2, 3, 4, 6].map((count) => ({ value: count, label: String(count) }))}
                  />
                </Field>
                <Field label="Metronome" info={INFO.click}>
                  <Toggle on={settings.click} onChange={(click) => update({ click })}>
                    {settings.click ? "Click on" : "Click off"}
                  </Toggle>
                </Field>
                <Slider
                  label="Click volume"
                  value={Math.round(settings.clickVolume * 100)}
                  min={0}
                  max={100}
                  onChange={(value) => update({ clickVolume: value / 100 })}
                  display={`${Math.round(settings.clickVolume * 100)}%`}
                />
              </div>
            </div>
          </section>
        )}

        <p className="text-[13px] leading-relaxed text-bone-dim">
        {view.spiderDrawn ? (
          <>
            <b className="font-medium text-bone">Spider walk, {settings.spiderPattern}</b>, one note per beat. The
            filled dot is the note due now and the ringed one is next; the numbers are fingers, not frets. Space starts
            and stops, arrows change tempo. L, D and T switch modes.
          </>
        ) : chord ? (
          <>
            <b className="font-medium text-bone">
              {chord.name}, the {chord.roman} of {keyLabel(settings.root, settings.tonality)}
            </b>
            . Filled dot with a ring around it is the third, which is the note to aim at. Dashed dots are the half step
            either side of it, the ones you lean on to get there. Everything is counted from this chord, so when the
            chord changes the third moves with it. That is the thing the pentatonic box cannot show you.
          </>
        ) : view.rootMapDrawn ? (
          <>
            <b className="font-medium text-bone">Every {keyLabel(settings.root, settings.tonality).replace("m", "")} on the neck</b>
            . Each root takes the colour of the form that frets it, and the solid lines are octaves: the same note two
            strings over, which is the move you make when you shift position. The dashed lines are the two octave jump
            straight across all six strings. Turn labels off to test whether you can still find them.
          </>
        ) : view.landmarkDrawn ? (
          <>
            <b className="font-medium text-bone">
              Box {settings.pentShape} of the {KEYS[settings.tonality === "minor" ? settings.root : relativeMinor(settings.root)]}{" "}
              minor pentatonic
            </b>
            {LANDMARKS.includes(settings.pentShape) ? ", one of the two landmarks" : ""}. The filled dot is{" "}
            {settings.tonality === "major" ? "the major root, under your pinky" : "the minor root, under your index finger"}
            , which is home in this key. The ringed one is the other root: the same box is{" "}
            {KEYS[settings.tonality === "minor" ? settings.root : relativeMinor(settings.root)]} minor and{" "}
            {KEYS[settings.tonality === "major" ? settings.root : relativeMajor(settings.root)]} major, and which is
            home depends only on the key you are in. The line is the diagonal run: two frets below the box, notes in
            pairs, a slide at the end of each pair.
          </>
        ) : view.allShapes ? (
          <>
            <b className="font-medium text-bone">
              {keyLabel(settings.root, settings.tonality)} chord tones across the whole neck
            </b>
            . Each dot takes the colour of the shape that frets it, and the bars under the neck show where each shape
            sits. A dot split between two colours belongs to both shapes at once, which is the seam you slide across.
            Faint dots are chord tones no shape frets. L and P switch modes.
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
            {view.scaleDrawn ? ", thin ring is the rest of the scale" : ""}. Arrows change position, L and P switch
            modes.
          </>
        )}
      </p>
      </main>
    </>
  );
}
