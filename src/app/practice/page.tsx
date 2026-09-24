"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import Fretboard from "@/components/Fretboard";
import PracticeHeader from "@/components/PracticeHeader";
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
import { FRET_COUNT, KEYS, SCALES, buildPositions, keyLabel, type Tonality } from "@/lib/music";
import { fromModeAndSystem, scaleForTonality, type AdvanceMode, type Labels, type Settings } from "@/lib/settings";
import { TOPICS, isTopic, topicOf } from "@/lib/topics";
import { findTheoryPage } from "@/lib/theory";
import { PROGRESSIONS, chordAt, nearestPosition, readBars, type Progression } from "@/lib/progressions";
import { useLibrary } from "@/hooks/useLibrary";
import { findSong } from "@/lib/songStore";
import { voice } from "@/lib/voicing";
import ChordWheel from "@/components/ChordWheel";
import { familyOn, positionOf, type WheelChord } from "@/lib/wheel";
import { LANDMARKS, PENT_SHAPES, relativeMajor, relativeMinor, type PentShape } from "@/lib/pentatonic";
import { DEFAULT_ADVANCE, deriveView } from "@/lib/view";
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
  view: "Close zooms to the shape you are on. Whole neck keeps the same notes but shows where the shape sits on the full neck.",
  labels: "What goes inside each dot. Degrees are the interval from the root, which is what transfers between keys; notes are the note names. None is the useful one: with the numbers gone you find out whether you know the shape or have been reading it.",
  shape:
    "The five CAGED shapes, ordered up the neck and named for the open chord each one comes from. All shows every shape at once, each in its own colour. Roots strips it back to the root notes and the octave links between them, which is the map underneath everything else.",
  scale:
    "The scale drawn around the shape. Turn it off to leave just the chord tones, which is how you check you actually know where the 1, 3 and 5 are rather than running a pattern.",
  pentShape:
    "The pentatonic as five numbered boxes rather than through the CAGED shapes. Boxes one and four are the landmarks, marked with a dot: one has its root under your index finger on the low E, the other on the A string. Learn those two and the other three are filler.",
  boxMode:
    "Where the drill sends you next. Up the neck walks the five boxes in order; landmarks only bounces between boxes one and four, which is the pair worth owning.",
  run: "The diagonal extension. Start two frets below the box, play the notes in pairs, and slide at the end of each pair. It is the same five notes climbing through three octaves, and it lands you exactly where the next landmark begins.",
  region: "The patch of neck you play in. It does not pick a chord: each chord's nearest shape is brought to you there.",
  changes: "Follow the chords instead of sitting on one. The shape chips still pick the region you play in, and each chord comes to you there. Degrees count from the chord you are on, so the third is always marked 3, whichever chord it belongs to.",
  progression: "Which form to walk. The twelve bar blues is the one you will hear; quick change borrows the IV early, in bar two.",
  drill: "What the clock is drilling. The shape drills move you around the neck; the spider walk is a finger exercise and takes the neck over while it runs.",
  beats: "Beats per bar. Sets how many pips the metronome counts before the accent comes round again.",
  advance:
    "How often the metronome moves you to another shape. The change lands on the downbeat, so you have the bar line to make the move.",
  direction: "Where the next shape comes from. Up and down walk the neck in order; random stops you anticipating it.",
  pair: "The other half of the slide drill. It shows on the neck as a dashed box, so you can see where you are going before you get there.",
  tap: "Every dot on the neck is playable. Tap one to hear it, which is worth doing with the drone on: that is how a degree stops being a number and starts being a sound.",
  family:
    "The six chords of the key, arranged so you can see why they are the six. Every key on the outside is a fifth from the next, every relative minor sits inside its major, and a key's chords are always three touching slices. Tap one to see its shape on the neck. Tap a slice outside the three to move to that key.",
  backing:
    "The chords of the progression, played as they come round, so there is something under you to play over. It lands on the downbeat of each bar with the click, and sits well below whatever you are playing.",
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

const LABELS: { value: Labels; label: string }[] = [
  { value: "degrees", label: "Degrees" },
  { value: "notes", label: "Notes" },
  { value: "none", label: "Nothing" },
];

const MOVE_EVERY = [1, 2, 4, 8].map((count) => ({ value: count, label: `${count} bar${count === 1 ? "" : "s"}` }));

/** Degree order, so the chords of a key read I, ii, iii, IV, V, vi rather than round the wheel. */
const byDegree = (a: WheelChord, b: WheelChord) => parseInt(a.degree, 10) - parseInt(b.degree, 10);

export default function Page() {
  const { settings, update, hydrated } = useSettings();
  const view = deriveView(settings);

  const positions = useMemo(() => buildPositions(settings.root, settings.tonality), [settings.root, settings.tonality]);
  const anchor = positions[Math.min(settings.positionIndex, positions.length - 1)];
  const pairPosition = positions[Math.min(settings.pairIndex, positions.length - 1)];
  const intervals = SCALES[settings.tonality][settings.scale] ?? Object.values(SCALES[settings.tonality])[0];

  // Keys: the chords of the key, and which one of them the neck is showing.
  const family = useMemo(
    () => familyOn(positionOf(settings.root, settings.tonality)).sort(byDegree),
    [settings.root, settings.tonality],
  );
  const home =
    family.find((entry) => entry.root === settings.root && entry.ring === settings.tonality) ?? family[0];
  const keyChord = view.keysDrawn
    ? family.find((entry) => `${entry.at}:${entry.ring}` === settings.keyChord) ?? home
    : null;
  const keyChordRoot = keyChord?.root ?? settings.root;
  const keyChordTonality: Tonality = keyChord ? keyChord.ring : settings.tonality;
  const keyChordPositions = useMemo(
    () => buildPositions(keyChordRoot, keyChordTonality),
    [keyChordRoot, keyChordTonality],
  );

  const library = useLibrary();
  const fromSong = settings.customSong ? findSong(library, settings.customSong) : undefined;
  const progression: Progression = useMemo(() => {
    const handed = settings.progression === "custom" ? readBars(settings.customBars) : null;
    if (handed) {
      return {
        id: "custom",
        name: fromSong?.title ?? "From a song",
        blurb: "The first section of the song's chart, in the key the song is in.",
        ...handed,
        perLine: handed.bars.length % 4 === 0 ? 4 : Math.min(handed.bars.length, 3),
      };
    }
    return PROGRESSIONS.find((entry) => entry.id === settings.progression) ?? PROGRESSIONS[0];
  }, [settings.progression, settings.customBars, fromSong]);
  // A song handed over sits with the blues forms as one more thing to walk.
  const progressionOptions = [
    ...(readBars(settings.customBars) ? [{ value: "custom", label: fromSong?.title ?? "From a song" }] : []),
    ...PROGRESSIONS.map((entry) => ({ value: entry.id, label: entry.name })),
  ];
  const resolvedTheme = useTheme(settings.theme);
  const audioReady = useAudioReady();
  const palette = paletteFor(resolvedTheme);

  /*
   * The topic lives in the URL as well as in storage, so a Home Screen icon can
   * open straight onto one, and a song page can hand over its chords. Links from
   * before topics (?mode=drill&system=scales) still land where they meant to.
   *
   * One effect, in order: the first time, read the link and apply it; every time
   * after, write back what you are on. Writing first would overwrite the link
   * before anyone had read it.
   */
  const linkRead = useRef(false);
  useEffect(() => {
    if (!hydrated) return;
    if (!linkRead.current) {
      linkRead.current = true;
      const params = new URLSearchParams(window.location.search);
      const patch: Partial<Settings> = {};
      const topic = params.get("topic");
      if (isTopic(topic)) patch.topic = topic;
      const clock = params.get("clock");
      if (clock === "explore" || clock === "drill") patch.clock = clock;
      const mode = params.get("mode");
      const system = params.get("system");
      if (!patch.topic && (mode || system)) {
        Object.assign(
          patch,
          fromModeAndSystem({ mode: mode ?? undefined, system: system ?? undefined, drill: params.get("drill") ?? undefined }),
        );
      }

      const key = Number(params.get("key"));
      if (params.has("key") && Number.isInteger(key) && key >= 0 && key < 12) {
        patch.root = key;
        patch.positionIndex = 0;
        patch.pairIndex = 2;
        patch.keyChord = "";
      }
      const tonality = params.get("tonality");
      if (tonality === "major" || tonality === "minor") patch.tonality = tonality;
      const drill = params.get("drill");
      if (drill === "caged" || drill === "slide" || drill === "boxes" || drill === "changes") patch.drill = drill;
      if (drill === "spider") patch.topic = "fingers";
      // A song page links straight in with its key, its chords and the drill on.
      const bars = params.get("bars");
      if (bars && readBars(bars)) {
        patch.progression = "custom";
        patch.customBars = bars;
        patch.customSong = params.get("song") ?? "";
        patch.chordBar = 0;
        patch.topic = "changes";
        if (!patch.clock) patch.clock = "drill";
      }
      if (Object.keys(patch).length) {
        update(patch);
        return;
      }
    }
    const url = new URL(window.location.href);
    url.search = "";
    url.searchParams.set("topic", settings.topic);
    if (topicOf(settings.topic).explore && topicOf(settings.topic).drill) url.searchParams.set("clock", settings.clock);
    window.history.replaceState(window.history.state, "", url);
  }, [hydrated, update, settings.topic, settings.clock]);

  const advance = useCallback(() => {
    update((current) => advancePatch(current, positions.length));
  }, [update, positions.length]);

  /**
   * The backing, when following changes. Asked for a bar while that bar is
   * still being scheduled, so it reads the progression rather than any state
   * that has already moved on.
   */
  const chordFor = useCallback(
    (bar: number) => {
      if (!view.changesDrawn || !settings.soundChanges) return null;
      const sounding = chordAt(progression, settings.root, bar, settings.tonality);
      // A song's chords are played as written. The blues forms are all dominant
      // sevenths, and without them it is not the blues.
      return progression.minor ? voice(sounding.root, !!sounding.minor) : voice(sounding.root, false, true);
    },
    [view.changesDrawn, settings.soundChanges, settings.root, settings.tonality, progression],
  );

  const metronome = useMetronome({
    bpm: settings.bpm,
    beats: settings.beats,
    click: settings.click,
    volume: settings.clickVolume,
    advanceBars: view.advanceBars,
    onAdvance: advance,
    chordFor,
    chordVolume: settings.soundChanges ? settings.soundChangesVolume : 0,
  });

  // Leaving a drill for somewhere without a clock stops the clock with it.
  const { playing, toggle } = metronome;
  useEffect(() => {
    if (!view.drilling && playing) toggle();
  }, [view.drilling, playing, toggle]);

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
  const activeBar = metronome.playing && view.drilling ? metronome.bar : settings.chordBar;
  const chord = view.changesDrawn ? chordAt(progression, settings.root, activeBar, settings.tonality) : null;
  // Following changes, or looking at one chord of a key, the neck shows that
  // chord's own shape nearest where you already are.
  const position = chord
    ? nearestPosition(chord.root, chord.minor ? "minor" : "major", anchor.fret)
    : keyChord
      ? nearestPosition(keyChord.root, keyChordTonality, anchor.fret)
      : anchor;

  // The accent follows the shape, so the whole interface tells you where you are.
  const accent = palette.shapes[position.name];
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--accent", accent);
    // The light theme's shape colours are dark, so what sits on them turns white.
    root.style.setProperty("--on-accent", palette.onAccent);
    root.style.setProperty("--fb-dim", palette.dim);
    // Put it back on the way out. Without this the shape colour followed you
    // to every other page for the rest of the session, so the stand and the
    // song pages quietly turned whatever colour Practice was last showing.
    return () => {
      root.style.removeProperty("--accent");
      root.style.removeProperty("--on-accent");
      root.style.removeProperty("--fb-dim");
    };
  }, [accent, palette.dim, palette.onAccent]);

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

  const setKey = useCallback(
    (root: number, tonality: Tonality) =>
      update((current) => ({
        root,
        tonality,
        scale: scaleForTonality(current.scale, tonality),
        positionIndex: 0,
        pairIndex: 2,
        keyChord: "",
      })),
    [update],
  );

  const step = useCallback(
    (direction: 1 | -1) =>
      update((current) => ({
        positionIndex: (current.positionIndex + direction + positions.length) % positions.length,
        allShapes: false,
      })),
    [update, positions.length],
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.isContentEditable)) return;
      const topic = /^Digit([1-6])$/.exec(event.code);
      if (topic) {
        update({ topic: TOPICS[Number(topic[1]) - 1].value });
        return;
      }
      switch (event.code) {
        case "Space":
          // The transport exists where there is a clock, so space belongs there.
          if (!view.drilling) return;
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
        case "KeyE":
          update({ clock: "explore" });
          break;
        case "KeyD":
          update({ clock: "drill" });
          break;
        case "KeyO":
          update({ drone: !settings.drone });
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [metronome, setBpm, step, update, view.drilling, settings.bpm, settings.drone]);

  const selectPosition = useCallback(
    (index: number) =>
      update((current) => {
        if (current.drill === "slide" && index === current.pairIndex) {
          return { positionIndex: index, pairIndex: current.positionIndex, allShapes: false };
        }
        return { positionIndex: index, allShapes: false };
      }),
    [update],
  );

  const playNote = useCallback((midi: number) => getAudioEngine().pluck(midi, 0.6), []);

  const shapeOptions = positions.map((entry, index) => ({
    value: String(index),
    label: `${entry.name}${entry.fret === 0 ? " (open)" : ` · ${entry.fret}`}`,
    title: entry.fret === 0 ? `${entry.name} shape at the nut` : `${entry.name} shape, index finger at fret ${entry.fret}`,
  }));
  const pairOptions = positions.map((entry, index) => ({
    value: index,
    label: `${entry.name}${entry.fret === 0 ? " (open)" : ` · ${entry.fret}`}`,
  }));

  const topicEntry = topicOf(settings.topic);
  const available = topicEntry.drills ? drillsFor(topicEntry.drills) : [];
  const drill = available.find((entry) => entry.id === settings.drill) ?? available[0];
  // Moving to a topic lands you on a drill that topic actually has.
  useEffect(() => {
    if (drill && settings.drill !== drill.id) update({ drill: drill.id });
  }, [settings.drill, drill, update]);

  const theory = topicEntry.theory ? findTheoryPage(topicEntry.theory) : undefined;
  const key = keyLabel(settings.root, settings.tonality);
  const keyName = `${KEYS[settings.root]} ${settings.tonality}`;
  const where = position.fret === 0 ? "at the nut" : `at fret ${position.fret}`;
  const moving = view.advanceBars ? ` · moves every ${view.advanceBars} bar${view.advanceBars === 1 ? "" : "s"}` : "";

  // One line, big enough to read from the stand, saying what the neck is showing.
  const [headline, detail] = view.spiderDrawn
    ? [`Spider walk, ${settings.spiderPattern}`, `from fret ${settings.spiderStartFret}, one note a beat`]
    : view.rootMapDrawn
      ? [`Every ${KEYS[settings.root]} on the neck`, "the roots, and the octaves between them"]
      : view.landmarkDrawn
        ? [
            settings.pentLandmarks ? "Both landmarks" : `Box ${settings.pentShape}`,
            // Named for the key you are in, not for whichever name the boxes happen to
            // be built from. Picking C major and being told A minor is a small lie.
            `${KEYS[settings.root]} ${settings.tonality} pentatonic${moving}`,
          ]
        : chord
          ? [`${chord.name}, the ${chord.roman}`, `bar ${(activeBar % progression.bars.length) + 1} of ${progression.bars.length} · ${progression.name}`]
          : keyChord
            ? [`${keyChord.name}, the ${keyChord.roman} of ${keyName}`, `${position.name} shape ${where}`]
            : view.allShapes
              ? ["All five shapes", `${key} chord tones`]
              : [`${position.name} shape, ${where}`, `${key}${view.scaleDrawn ? ` ${settings.scale.toLowerCase()}` : " chord tones"}${moving}`];

  const inEachDot = (
    <Field label="In each dot" info={INFO.labels}>
      <Segmented ariaLabel="In each dot" value={settings.labels} onChange={(labels) => update({ labels })} options={LABELS} />
    </Field>
  );
  const progressionPicker = (
    <>
      <Field label="Progression" info={INFO.progression}>
        <ChipGroup
          ariaLabel="Progression"
          value={settings.progression}
          onChange={(value) => update({ progression: value, chordBar: 0 })}
          options={progressionOptions}
        />
      </Field>
      <BarStrip
        progression={progression}
        keyRoot={settings.root}
        tonality={settings.tonality}
        bar={activeBar}
        onSelect={metronome.playing ? undefined : (value) => update({ chordBar: value })}
      />
      {settings.progression === "custom" && fromSong ? (
        <Link href={`/songs/${fromSong.slug}`} className="btn self-start">
          &larr; Back to {fromSong.title}
        </Link>
      ) : null}
    </>
  );
  const region = (
    <Field label="Where on the neck" info={INFO.region}>
      <ChipGroup
        ariaLabel="Where on the neck"
        value={String(settings.positionIndex)}
        onChange={(value) => selectPosition(Number(value))}
        options={positions.map((entry, index) => ({
          value: String(index),
          label: entry.fret === 0 ? "Nut" : `Fret ${entry.fret}`,
          title: `Play around fret ${entry.fret}`,
        }))}
      />
    </Field>
  );
  const moveEvery = (
    <Field label="Move every" info={INFO.advance}>
      <Segmented
        ariaLabel="Move every"
        value={settings.advanceBars || DEFAULT_ADVANCE}
        onChange={(advanceBars) => update({ advanceBars })}
        options={MOVE_EVERY}
      />
    </Field>
  );
  const runToggle = (
    <Field label="Diagonal run" info={INFO.run}>
      <Toggle on={settings.showRun} onChange={(showRun) => update({ showRun })}>
        {settings.showRun ? "Shown" : "Hidden"}
      </Toggle>
    </Field>
  );

  return (
    <>
      <SiteNav sticky={false} />
      <main
        className="mx-auto flex min-h-[100dvh] w-full max-w-[1400px] flex-col gap-3 px-[var(--gutter)] pb-[max(14px,env(safe-area-inset-bottom))]"
        style={{ visibility: hydrated ? "visible" : "hidden" }}
      >
        <div className="sticky top-0 z-20 -mx-[var(--gutter)] flex flex-col gap-2.5 bg-ink px-[var(--gutter)] pb-2 pt-[max(10px,env(safe-area-inset-top))]">
          <PracticeHeader
            root={settings.root}
            tonality={settings.tonality}
            drone={settings.drone}
            droneFifth={settings.droneFifth}
            droneOctave={settings.droneOctave}
            droneVolume={settings.droneVolume}
            topic={settings.topic}
            clock={settings.clock}
            onKey={setKey}
            onChange={update}
            onTopic={(topic) => update({ topic })}
            onClock={(clock) => update({ clock })}
          />
          <div className="neck-frame relative">
            <span className="pointer-events-none absolute bottom-2 right-3 z-10 font-mono text-[10px] uppercase tracking-[0.09em] text-bone-dim opacity-70">
              tap a note to hear it
            </span>
            <Fretboard
              position={position}
              positions={keyChord ? keyChordPositions : positions}
              pair={view.pairDrawn ? pairPosition : null}
              root={keyChordRoot}
              tonality={keyChordTonality}
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
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 px-1">
            <h1 className="text-[20px] font-medium tracking-tight">{headline}</h1>
            <span className="text-[14px] text-bone-dim">{detail}</span>
            {theory ? (
              <Link
                href={`/theory/${theory.slug}`}
                className="ml-auto text-[14px] text-bone underline decoration-line underline-offset-4 hover:decoration-bone-dim"
              >
                Why? {theory.title} &rarr;
              </Link>
            ) : null}
          </div>
        </div>

        {view.drilling ? (
          <Transport
            playing={metronome.playing}
            onToggle={metronome.toggle}
            bpm={settings.bpm}
            onBpm={setBpm}
            beats={settings.beats}
            beat={metronome.beat}
            bar={metronome.bar}
          />
        ) : null}

        <section aria-label={topicEntry.label} className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {/* ----- Neck ----- */}
          {settings.topic === "neck" ? <div className="panel flex flex-col gap-4">{inEachDot}</div> : null}

          {/* ----- Shapes ----- */}
          {settings.topic === "shapes" && !view.drilling ? (
            <>
              <div className="panel flex flex-col gap-4">
                <Field label="Shape" info={INFO.shape}>
                  <ChipGroup
                    ariaLabel="Shape"
                    value={settings.allShapes ? "all" : String(settings.positionIndex)}
                    onChange={(value) => (value === "all" ? update({ allShapes: true }) : selectPosition(Number(value)))}
                    options={[...shapeOptions, { value: "all", label: "All five", title: "Every shape at once, colour coded" }]}
                  />
                  {!view.allShapes ? <CycleStrip positions={positions} current={position.name} palette={palette} /> : null}
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
                    ) : null}
                  </Field>
                ) : null}
              </div>
              <div className="panel flex flex-col gap-4">
                {inEachDot}
                {view.zoomAvailable ? (
                  <Field label="View" info={INFO.view}>
                    <Segmented
                      ariaLabel="View"
                      value={settings.zoom}
                      onChange={(zoom) => update({ zoom })}
                      options={[
                        { value: "position", label: "Close" },
                        { value: "neck", label: "Whole neck" },
                      ]}
                    />
                  </Field>
                ) : null}
                {view.note ? <p className="text-[13px] leading-relaxed text-bone-dim">{view.note}</p> : null}
              </div>
            </>
          ) : null}

          {settings.topic === "shapes" && view.drilling ? (
            <>
              <div className="panel flex flex-col gap-4">
                <Field label="Drill" info={INFO.drill}>
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
                {moveEvery}
                {settings.drill === "slide" ? (
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
                      options={pairOptions}
                    />
                  </Field>
                ) : (
                  <Field label="Where next" info={INFO.direction}>
                    <ChipGroup
                      ariaLabel="Where next"
                      value={settings.advanceMode}
                      onChange={(advanceMode) => update({ advanceMode })}
                      options={ADVANCE_MODES}
                    />
                  </Field>
                )}
              </div>
            </>
          ) : null}

          {/* ----- Boxes ----- */}
          {settings.topic === "boxes" ? (
            <>
              <div className="panel flex flex-col gap-4">
                {view.drilling ? (
                  <>
                    <p className="text-[13px] leading-relaxed text-bone-dim">{drill?.blurb}</p>
                    {moveEvery}
                    <Field label="Where next" info={INFO.boxMode}>
                      <ChipGroup
                        ariaLabel="Where next"
                        value={settings.boxMode}
                        onChange={(boxMode: BoxMode) => update({ boxMode })}
                        options={BOX_MODES}
                      />
                    </Field>
                  </>
                ) : (
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
                          ...PENT_SHAPES.map((shape) => ({
                            value: String(shape),
                            // Named, not just dotted: a mark alone is not enough to carry it.
                            label: LANDMARKS.includes(shape) ? `${shape} · landmark` : String(shape),
                            title: LANDMARKS.includes(shape) ? `Box ${shape}, a landmark` : `Box ${shape}`,
                          })),
                          { value: "landmarks", label: "Both landmarks", title: "Boxes one and four, everywhere they fall" },
                        ]}
                      />
                    </Field>
                    {settings.pentLandmarks ? (
                      <p className="text-[13px] leading-relaxed text-bone-dim">
                        Box one in one colour, box four in the other, wherever each falls. Pick a single box to see its
                        diagonal run.
                      </p>
                    ) : null}
                  </>
                )}
              </div>
              <div className="panel flex flex-col gap-4">
                {!settings.pentLandmarks || view.drilling ? runToggle : null}
                {inEachDot}
              </div>
            </>
          ) : null}

          {/* ----- Changes ----- */}
          {settings.topic === "changes" ? (
            <>
              <div className="panel flex flex-col gap-4">
                {progressionPicker}
                {view.drilling ? (
                  <p className="text-[13px] leading-relaxed text-bone-dim">
                    {metronome.playing
                      ? `Bar ${(activeBar % progression.bars.length) + 1} of ${progression.bars.length}. Stay where you are and let the chords come to you.`
                      : "Press play and the form walks itself, a bar at a time."}
                  </p>
                ) : null}
              </div>
              <div className="panel flex flex-col gap-4">
                {region}
                {view.drilling ? (
                  <>
                    <Field label="Backing" info={INFO.backing}>
                      <Toggle on={settings.soundChanges} onChange={(soundChanges) => update({ soundChanges })}>
                        {settings.soundChanges ? "Chords on" : "Chords off"}
                      </Toggle>
                    </Field>
                    {settings.soundChanges ? (
                      <Slider
                        label="Backing volume"
                        value={Math.round(settings.soundChangesVolume * 100)}
                        min={0}
                        max={100}
                        onChange={(value) => update({ soundChangesVolume: value / 100 })}
                        display={`${Math.round(settings.soundChangesVolume * 100)}%`}
                      />
                    ) : null}
                  </>
                ) : (
                  <>
                    {inEachDot}
                    <TechniqueNote />
                  </>
                )}
              </div>
            </>
          ) : null}

          {/* ----- Keys ----- */}
          {settings.topic === "keys" ? (
            <div className="panel flex flex-col gap-5 sm:flex-row sm:items-start lg:col-span-2">
              <ChordWheel
                root={settings.root}
                tonality={settings.tonality}
                onPick={(root, tonality) => {
                  // One of the key's own chords shows it on the neck. Anywhere else
                  // on the wheel is the next key round.
                  const hit = family.find((entry) => entry.root === root && entry.ring === tonality);
                  if (hit) update({ keyChord: `${hit.at}:${hit.ring}` });
                  else setKey(root, tonality);
                }}
              />
              <Field label={`The chords of ${keyName}`} info={INFO.family} className="flex-1">
                <div role="group" aria-label={`The chords of ${keyName}`} className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {family.map((entry) => (
                    <button
                      key={`${entry.at}:${entry.ring}`}
                      type="button"
                      className="chip flex min-h-16 flex-col items-start justify-center gap-0.5 text-left"
                      aria-pressed={entry === keyChord}
                      onClick={() => update({ keyChord: `${entry.at}:${entry.ring}` })}
                    >
                      <span className="font-mono text-[12px] opacity-75">
                        {entry.roman} · {entry.degree}
                      </span>
                      <b className="text-[18px] font-medium leading-tight">{entry.name}</b>
                    </button>
                  ))}
                </div>
              </Field>
            </div>
          ) : null}

          {/* ----- Fingers ----- */}
          {settings.topic === "fingers" ? (
            <>
              <div className="panel flex flex-col gap-4">
                <p className="text-[13px] leading-relaxed text-bone-dim">{drill?.blurb}</p>
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
              </div>
              <div className="panel flex flex-col gap-4">
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
              </div>
            </>
          ) : null}

          {/* The metronome itself, wherever there is one. Set once and left alone. */}
          {view.drilling ? (
            <details className="panel lg:col-span-2">
              <summary className="flex min-h-11 cursor-pointer items-center text-[14px] text-bone-dim">
                Metronome: {settings.beats} beats a bar, click {settings.click ? "on" : "off"}
              </summary>
              <div className="mt-3 flex flex-wrap items-end gap-x-6 gap-y-4">
                <Field label="Beats per bar" info={INFO.beats}>
                  <Segmented
                    ariaLabel="Beats per bar"
                    value={settings.beats}
                    onChange={(beats) => update({ beats })}
                    options={[2, 3, 4, 6].map((count) => ({ value: count, label: String(count) }))}
                  />
                </Field>
                <Field label="Click" info={INFO.click}>
                  <Toggle on={settings.click} onChange={(click) => update({ click })}>
                    {settings.click ? "Click on" : "Click off"}
                  </Toggle>
                </Field>
                <div className="min-w-[220px] flex-1">
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
            </details>
          ) : null}
        </section>

        <p className="text-[13px] leading-relaxed text-bone-dim">
        {view.spiderDrawn ? (
          <>
            <b className="font-medium text-bone">Spider walk, {settings.spiderPattern}</b>, one note per beat. The
            filled dot is the note due now and the ringed one is next; the numbers are fingers, not frets.
          </>
        ) : chord ? (
          <>
            <b className="font-medium text-bone">
              {chord.name}, the {chord.roman} of {keyLabel(settings.root, settings.tonality)}
            </b>
            . Filled dot with a ring around it is the third, which is the note to aim at. Dashed dots are the half step
            either side of it, the ones you lean on to get there. Everything is counted from this chord, so when the
            chord changes the third moves with it.
          </>
        ) : keyChord ? (
          <>
            <b className="font-medium text-bone">
              {keyChord.name}, the {keyChord.roman} of {keyName}
            </b>
            , as the {position.name} shape. Filled dot is its root. Tap another chord of the key to move to it, or a
            slice outside the three to change key.
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
              {settings.pentLandmarks ? "Boxes 1 and 4" : `Box ${settings.pentShape}`} of the{" "}
              {KEYS[settings.tonality === "minor" ? settings.root : relativeMinor(settings.root)]} minor pentatonic
            </b>
            {settings.pentLandmarks
              ? ", the two landmarks"
              : LANDMARKS.includes(settings.pentShape)
                ? ", one of the two landmarks"
                : ""}
            . The filled dot is{" "}
            {settings.tonality === "major" ? "the major root, under your pinky" : "the minor root, under your index finger"}
            , which is home in this key. The ringed one is the other root: the same box is{" "}
            {KEYS[settings.tonality === "minor" ? settings.root : relativeMinor(settings.root)]} minor and{" "}
            {KEYS[settings.tonality === "major" ? settings.root : relativeMajor(settings.root)]} major, and which is
            home depends only on the key you are in.
            {settings.pentLandmarks
              ? ""
              : " The line is the diagonal run: two frets below the box, notes in pairs, a slide at the end of each pair."}
          </>
        ) : view.allShapes ? (
          <>
            <b className="font-medium text-bone">
              {keyLabel(settings.root, settings.tonality)} chord tones across the whole neck
            </b>
            . Each dot takes the colour of the shape that frets it, and the bars under the neck show where each shape
            sits. A dot split between two colours belongs to both shapes at once, which is the seam you slide across.
            Faint dots are chord tones no shape frets.
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
            {view.scaleDrawn ? ", thin ring is the rest of the scale" : ""}.
          </>
        )}
      </p>
      {/* Only where there is a keyboard to press them. */}
      <p className="hidden font-mono text-[12px] text-bone-dim pointer-fine:block">
        ← → shape · ↑ ↓ tempo · space start · 1–6 topic · E D explore or drill · O drone
      </p>
      </main>
    </>
  );
}
