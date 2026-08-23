import { KEYS, buildPositions, type Position, type Tonality } from "./music";

/**
 * Progressions are stored as one entry per bar, each the distance in semitones
 * from the key root: 0 is the I, 5 the IV, 7 the V. Keeping them as data means a
 * new progression is a new row here rather than new code.
 */
export type Progression = {
  id: string;
  name: string;
  blurb: string;
  /** Semitones above the key root, one per bar. */
  bars: number[];
  /** Bars per line when the form is drawn as a chart. */
  perLine: number;
};

export const PROGRESSIONS: Progression[] = [
  {
    id: "blues12",
    name: "12-bar blues",
    blurb: "The form itself. Four bars of I, two of IV, back to I, then the V, the IV and the turnaround.",
    bars: [0, 0, 0, 0, 5, 5, 0, 0, 7, 5, 0, 7],
    perLine: 4,
  },
  {
    id: "blues12quick",
    name: "Quick change",
    blurb: "The same twelve bars with the IV borrowed early, in bar two. More common than the plain form on record.",
    bars: [0, 5, 0, 0, 5, 5, 0, 0, 7, 5, 0, 7],
    perLine: 4,
  },
  {
    id: "iiv",
    name: "I IV V",
    blurb: "The three chords on their own, a bar each, for when you want the changes without the form.",
    bars: [0, 5, 7],
    perLine: 3,
  },
];

export const ROMAN: Record<number, string> = { 0: "I", 5: "IV", 7: "V" };

export type Chord = {
  /** Pitch class of this chord's own root. */
  root: number;
  /** Semitones above the key root. */
  offset: number;
  name: string;
  roman: string;
};

export function chordAt(progression: Progression, keyRoot: number, bar: number): Chord {
  const offset = progression.bars[((bar % progression.bars.length) + progression.bars.length) % progression.bars.length];
  const root = (keyRoot + offset) % 12;
  return { root, offset, name: KEYS[root], roman: ROMAN[offset] ?? "?" };
}

/**
 * The shape of this chord that falls nearest the position you are already in.
 * This is the whole of the lesson's first level: rather than chasing one chord up
 * the neck, you stay put and let the changes come to you.
 */
export function nearestPosition(chordRoot: number, tonality: Tonality, anchorFret: number): Position {
  const positions = buildPositions(chordRoot, tonality);
  return positions.reduce((best, entry) => {
    // Shapes repeat at the twelfth fret, so an octave up may be the closer one.
    const distance = Math.min(Math.abs(entry.fret - anchorFret), Math.abs(entry.fret + 12 - anchorFret));
    const bestDistance = Math.min(Math.abs(best.fret - anchorFret), Math.abs(best.fret + 12 - anchorFret));
    return distance < bestDistance ? entry : best;
  });
}

/** The note you are aiming at, and the two semitone neighbours you lean on to get there. */
export const TARGET_THIRD = 4;
export const APPROACH_BELOW = 3;
export const APPROACH_ABOVE = 5;
