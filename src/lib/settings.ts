import { EQUIVALENT_SCALE, SCALES, type Tonality } from "./music";

export type AdvanceMode = "up" | "down" | "random" | "pair";
export type Zoom = "position" | "neck";
export type Labels = "degrees" | "notes";

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
  /** The scale layer. Off leaves just the chord tones. */
  showScale: boolean;
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
  showScale: true,
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
    const parsed = { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<Settings>) };
    parsed.scale = scaleForTonality(parsed.scale, parsed.tonality);
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
