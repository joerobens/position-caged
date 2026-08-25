import { NAMES } from "./music";

/**
 * Tunings, as they matter to a song you are about to play.
 *
 * Two kinds live here. Some retunings move every string by the same amount —
 * a half step down is the clearest — and those behave exactly like a capo
 * pointing the other way: the shapes you hold stay familiar, and only the
 * sounding pitch moves. Those carry a `shift`, and the app does the key maths
 * for you.
 *
 * The rest — drop D, the open tunings — move strings by different amounts.
 * There is no single number that describes them, so they carry `shift: null`
 * and the app says the name and the strings and makes no claim about shapes.
 * Better to tell you the truth and let you work it out than to print a
 * confident wrong chord above a lyric.
 */
export type Tuning = {
  id: string;
  name: string;
  /** Pitch classes, low string to high. */
  strings: readonly number[];
  /** How it is written on a chart. */
  label: string;
  /** Semitones every string moves together, or null when they do not. */
  shift: number | null;
  /** Why you would use it. */
  note: string;
};

export const TUNINGS: readonly Tuning[] = [
  {
    id: "standard",
    name: "Standard",
    strings: [4, 9, 2, 7, 11, 4],
    label: "E A D G B e",
    shift: 0,
    note: "Everything the app draws assumes this.",
  },
  {
    id: "drop-d",
    name: "Drop D",
    strings: [2, 9, 2, 7, 11, 4],
    label: "D A D G B e",
    shift: null,
    note: "Low string down a tone. Power chords on one finger, and a deeper root.",
  },
  {
    id: "half-step-down",
    name: "Half step down",
    strings: [3, 8, 1, 6, 10, 3],
    label: "E♭ A♭ D♭ G♭ B♭ e♭",
    shift: -1,
    note: "Same shapes, everything sounds a semitone lower. Easier on the voice.",
  },
  {
    id: "whole-step-down",
    name: "Whole step down",
    strings: [2, 7, 0, 5, 9, 2],
    label: "D G C F A d",
    shift: -2,
    note: "Same shapes, a tone lower. Slacker strings, heavier sound.",
  },
  {
    id: "open-g",
    name: "Open G",
    strings: [2, 7, 2, 7, 11, 2],
    label: "D G D G B d",
    shift: null,
    note: "Strums a G chord open. Slide and country blues.",
  },
  {
    id: "open-d",
    name: "Open D",
    strings: [2, 9, 2, 6, 9, 2],
    label: "D A D F♯ A d",
    shift: null,
    note: "Strums a D chord open. Big ringing drones.",
  },
  {
    id: "open-e",
    name: "Open E",
    strings: [4, 11, 4, 8, 11, 4],
    label: "E B E G♯ B e",
    shift: null,
    note: "Open D shapes at concert pitch, at the cost of tighter strings.",
  },
];

export const STANDARD = TUNINGS[0];

export function tuningOf(id?: string | null): Tuning {
  return TUNINGS.find((tuning) => tuning.id === id) ?? STANDARD;
}

/** True when the song needs the guitar retuned before you can play it. */
export function needsRetune(id?: string | null): boolean {
  return tuningOf(id).id !== STANDARD.id;
}

/**
 * A uniform retuning is a capo with the sign flipped, so the two combine into
 * one number and the existing shape maths keeps working untouched.
 * Non-uniform tunings return the capo alone — we make no claim about shapes.
 */
export function effectiveCapo(capo?: number | null, tuning?: string | null): number {
  return (capo ?? 0) + (tuningOf(tuning).shift ?? 0);
}

/** How the strings are spelled, for a tuning you may not have met. */
export function stringNames(tuning: Tuning): string[] {
  return tuning.strings.map((pitch) => NAMES[pitch % 12]);
}
