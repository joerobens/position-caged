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
  /**
   * Which bars are minor chords, when the form says. A song's chart does; the
   * blues forms do not, and their chords take the quality of the key instead.
   */
  minor?: boolean[];
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

/** Every semitone above the key root, as a numeral. A song can land on any of them. */
const ROMAN = ["I", "bII", "II", "bIII", "III", "IV", "bV", "V", "bVI", "VI", "bVII", "VII"];

export type Chord = {
  /** Pitch class of this chord's own root. */
  root: number;
  /** Semitones above the key root. */
  offset: number;
  name: string;
  roman: string;
  /** A minor chord's third is a semitone lower, so the note to aim at moves with it. */
  minor?: boolean;
};

export function chordAt(progression: Progression, keyRoot: number, bar: number, tonality: Tonality = "major"): Chord {
  const index = ((bar % progression.bars.length) + progression.bars.length) % progression.bars.length;
  const offset = progression.bars[index];
  const root = (keyRoot + offset) % 12;
  const minor = progression.minor ? progression.minor[index] : tonality === "minor";
  const numeral = ROMAN[offset] ?? "?";
  return {
    root,
    offset,
    name: `${KEYS[root]}${minor ? "m" : ""}`,
    roman: minor ? numeral.toLowerCase() : numeral,
    minor,
  };
}

/**
 * A form as it travels in a link: one bar per entry, semitones above the key
 * root, with an m on the minor ones ("9m,5,0,7"). Anything unreadable is null.
 */
export function readBars(text: string): { bars: number[]; minor: boolean[] } | null {
  const entries = text.split(",").map((entry) => /^(\d{1,2})(m?)$/.exec(entry.trim()));
  if (!entries.length || entries.some((entry) => !entry || Number(entry[1]) > 11)) return null;
  return {
    bars: entries.map((entry) => Number(entry![1])),
    minor: entries.map((entry) => entry![2] === "m"),
  };
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

/** The note you are aiming at: the chord's own third, major or minor. */
export function thirdOf(chord: Chord): number {
  return chord.minor ? 3 : 4;
}
