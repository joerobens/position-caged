import { EQUIVALENT_SCALE, SCALES, type Tonality } from "./music";
import { SPIDER_PATTERNS, type BoxMode, type Drill, type SpiderPattern } from "./drills";
import type { PentShape } from "./pentatonic";
import type { ThemePreference } from "./theme";

/** Where the next shape comes from in the CAGED drill. */
export type AdvanceMode = "up" | "down" | "random";
/** What you are doing. Technique is deliberately outside the systems. */
export type Mode = "learn" | "drill" | "technique";
/** What you are working on. */
export type System = "neck" | "chords" | "scales" | "blues";
export type Zoom = "position" | "neck";
/** None is the one that tests whether you know the shape or are reading it. */
export type Labels = "degrees" | "notes" | "none";

export type Settings = {
  root: number;
  tonality: Tonality;
  scale: string;
  positionIndex: number;
  /** The second shape in a slide drill. */
  pairIndex: number;
  zoom: Zoom;
  labels: Labels;
  bpm: number;
  beats: number;
  click: boolean;
  clickVolume: number;
  /** Bars between shape changes. 0 is off. */
  advanceBars: number;
  advanceMode: AdvanceMode;
  drone: boolean;
  droneOctave: number;
  droneVolume: number;
  droneFifth: boolean;
  /** Show all five shapes across the whole neck, each in its own colour. */
  allShapes: boolean;
  /** Show only the roots, with the octave links that join them up. */
  rootMap: boolean;
  /** The pentatonic landmark view: numbered boxes and their diagonal runs. */
  landmark: boolean;
  pentShape: PentShape;
  /** Both landmarks at once, everywhere they fall, rather than one box. */
  pentLandmarks: boolean;
  /** Draw the diagonal extension that carries the box up the neck. */
  showRun: boolean;
  /** Follow a progression rather than sitting on one chord. */
  changes: boolean;
  progression: string;
  /** A chart handed over from a song page, as semitone offsets per bar. */
  customBars: string;
  /** Which bar of the form, when the clock is not running it. */
  chordBar: number;
  /** The scale layer. Off leaves just the chord tones. */
  showScale: boolean;
  /** Follow the system, or override it. */
  theme: ThemePreference;
  /** Lyric size on the stand, in pixels. Ignored while lyricFit is on. */
  lyricSize: number;
  /** Columns to read the words in on the stand. */
  lyricColumns: 1 | 2;
  /** Size the words to fill the screen exactly, so nothing needs scrolling. */
  lyricFit: boolean;
  /** Reading the neck, playing to the clock, or working the fingers. */
  mode: Mode;
  system: System;
  drill: Drill;
  /** Where the pentatonic drill sends you next. */
  boxMode: BoxMode;
  spiderStartFret: number;
  spiderPattern: SpiderPattern;
  /** Come back down as well as going up. */
  spiderBoth: boolean;
  /** Move up a fret at the end of each cycle. */
  spiderShift: boolean;
};

export const DEFAULT_SETTINGS: Settings = {
  root: 9,
  tonality: "major",
  scale: "Major pent",
  positionIndex: 0,
  pairIndex: 2,
  zoom: "position",
  labels: "degrees",
  bpm: 84,
  beats: 4,
  click: true,
  clickVolume: 0.8,
  advanceBars: 0,
  advanceMode: "up",
  drone: false,
  droneOctave: 0,
  droneVolume: 0.5,
  droneFifth: true,
  allShapes: false,
  rootMap: false,
  landmark: false,
  pentShape: 1,
  pentLandmarks: true,
  showRun: true,
  changes: false,
  progression: "blues12",
  customBars: "",
  chordBar: 0,
  showScale: true,
  theme: "system",
  lyricSize: 26,
  lyricColumns: 2,
  lyricFit: true,
  mode: "learn",
  system: "chords",
  drill: "caged",
  boxMode: "up",
  spiderStartFret: 5,
  spiderPattern: "1-2-3-4",
  spiderBoth: true,
  spiderShift: false,
};

export const STORAGE_KEY = "fretwork:v1";

/** Keeps the scale valid when the tonality flips, mapping to its parallel where one exists. */
export function scaleForTonality(scale: string, tonality: Tonality): string {
  if (SCALES[tonality][scale]) return scale;
  const swapped = EQUIVALENT_SCALE[scale];
  if (swapped && SCALES[tonality][swapped]) return swapped;
  return Object.keys(SCALES[tonality])[1];
}

export function loadSettings(): Settings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const stored = JSON.parse(raw) as Omit<Partial<Settings>, "advanceMode"> & { advanceMode?: string };
    // The slide drill used to be a fourth advance direction. It is a drill now.
    if (stored.advanceMode === "pair") {
      stored.advanceMode = "up";
      stored.drill = "slide";
    }
    /*
     * Play used to be two modes and a pile of booleans deciding what the neck
     * showed. It is a mode and a system now, so an old setting has to be read
     * back into the pair it was really expressing.
     */
    const legacy = stored as Partial<Settings> & { rootMap?: boolean; landmark?: boolean; changes?: boolean };
    if (!legacy.system) {
      legacy.system = legacy.landmark ? "scales" : legacy.rootMap ? "neck" : legacy.changes ? "blues" : "chords";
    }
    if ((stored.mode as string) === "practice") {
      stored.mode = stored.drill === "spider" ? "technique" : "drill";
      if (stored.mode === "drill" && stored.drill) {
        legacy.system = stored.drill === "changes" ? "blues" : stored.drill === "boxes" ? "scales" : "chords";
      }
    }
    const parsed = { ...DEFAULT_SETTINGS, ...(stored as Partial<Settings>) };
    parsed.scale = scaleForTonality(parsed.scale, parsed.tonality);
    if (!SPIDER_PATTERNS.includes(parsed.spiderPattern)) parsed.spiderPattern = DEFAULT_SETTINGS.spiderPattern;
    return parsed;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: Settings) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Private browsing, quota, or storage disabled. Practising still works.
  }
}
