import { EQUIVALENT_SCALE, SCALES, type Tonality } from "./music";
import { SPIDER_PATTERNS, type Drill, type SpiderPattern } from "./drills";
import type { ThemePreference } from "./theme";

/** Where the next shape comes from in the CAGED drill. */
export type AdvanceMode = "up" | "down" | "random";
export type Mode = "learn" | "practice";
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
  /** Reading the neck, or playing to the clock. */
  mode: Mode;
  drill: Drill;
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
  changes: false,
  progression: "blues12",
  customBars: "",
  chordBar: 0,
  showScale: true,
  theme: "system",
  mode: "learn",
  drill: "caged",
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
