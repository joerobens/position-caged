import { FRET_COUNT, OPEN } from "./music";

/** 1, b3, 4, 5, b7 counted from the minor root. */
export const MINOR_PENT = [0, 3, 5, 7, 10];

export type PentShape = 1 | 2 | 3 | 4 | 5;
export const PENT_SHAPES: PentShape[] = [1, 2, 3, 4, 5];

/**
 * The two shapes the whole system hangs on. One has its root under your index
 * finger on the low E, the other on the A string, and between them you can find
 * your place anywhere on the neck without counting boxes.
 */
export const LANDMARKS: PentShape[] = [1, 4];

/** A pentatonic box, two notes on every string. */
export type Box = {
  shape: PentShape;
  /** Lowest fret of the box, on the low E string. */
  low: number;
  /** [lower, upper] fret per string, low E first. */
  strings: [number, number][];
};

/** Every fret on one string that sounds a note of the scale, ascending. */
function fretsOn(string: number, minorRoot: number): number[] {
  const out: number[] = [];
  for (let fret = 0; fret <= FRET_COUNT + 12; fret++) {
    const degree = ((OPEN[string] + fret - minorRoot) % 12 + 12) % 12;
    if (MINOR_PENT.includes(degree)) out.push(fret);
  }
  return out;
}

/**
 * Shape n starts on the nth note of the pentatonic on the low E string, and every
 * other string then takes the two lowest notes at or above that fret. The B string
 * shifting up a fret is not a special case in the rule; it falls out of the tuning.
 */
export function pentBox(minorRoot: number, shape: PentShape, octave = 0): Box {
  const startDegree = MINOR_PENT[shape - 1];
  let low = 0;
  while (((OPEN[0] + low - minorRoot) % 12 + 12) % 12 !== startDegree) low++;
  low += octave * 12;

  const strings = Array.from({ length: 6 }, (_, string) => {
    const frets = fretsOn(string, minorRoot).filter((fret) => fret >= low);
    return [frets[0], frets[1]] as [number, number];
  });
  return { shape, low, strings };
}

/** Which shapes of this key fall on the neck, in order up it. */
export function boxesOnNeck(minorRoot: number): Box[] {
  const out: Box[] = [];
  for (const shape of PENT_SHAPES) {
    for (const octave of [0, 1]) {
      const box = pentBox(minorRoot, shape, octave);
      if (box.low <= FRET_COUNT - 3) out.push(box);
    }
  }
  return out.sort((a, b) => a.low - b.low);
}

export type RunNote = {
  string: number;
  fret: number;
  /** This note is reached by sliding up from the one before it. */
  slid: boolean;
};

/**
 * The diagonal extension: the same five notes climbing the neck in groups, each
 * group ending in a slide. Starting two frets below the box is what turns a box
 * into a line, and the slide is what carries you into the next octave.
 */
export function diagonalRun(minorRoot: number, shape: PentShape, octave = 0): RunNote[] {
  const box = pentBox(minorRoot, shape, octave);
  const notes: RunNote[] = [];
  let from = box.low - 2;

  for (const pair of [
    [0, 1],
    [2, 3],
    [4, 5],
  ]) {
    for (const string of pair) {
      const frets = fretsOn(string, minorRoot).filter((fret) => fret >= from && fret <= FRET_COUNT);
      if (frets[0] !== undefined) notes.push({ string, fret: frets[0], slid: false });
      if (frets[1] !== undefined) notes.push({ string, fret: frets[1], slid: false });
    }
    // The slide: one more note on the upper string of the pair.
    const upper = pair[1];
    const frets = fretsOn(upper, minorRoot).filter((fret) => fret >= from && fret <= FRET_COUNT);
    if (frets[2] !== undefined) notes.push({ string: upper, fret: frets[2], slid: true });
    // Two strings up is two frets, or three across the B string. The same octave
    // shape the root map draws.
    from += pair[0] === 2 ? 3 : 2;
  }
  return notes.filter((note) => note.fret >= 0);
}

/** The same box is a minor pentatonic and a major one, three semitones apart. */
export function relativeMajor(minorRoot: number): number {
  return (minorRoot + 3) % 12;
}
export function relativeMinor(majorRoot: number): number {
  return (majorRoot + 9) % 12;
}
