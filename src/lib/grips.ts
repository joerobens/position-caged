import { OPEN, SHAPES, type ShapeName, type Tonality } from "./music";

/**
 * Chord forms beyond the plain triad.
 *
 * The CAGED table holds a major and a minor form for each of the five shapes,
 * which is what the fretboard needs. A chart asks for more than that: a chart
 * that says 57 wants a dominant seventh, and drawing a plain triad under that
 * label is a diagram telling you something the chart did not say.
 *
 * These are the movable forms that are actually played. Not every quality has
 * a sensible form in every shape, and the ones that would be a stretch are
 * left out rather than invented: what is missing falls back to the triad and
 * the label says so.
 *
 * Offsets are from the fret the shape sits at, as in the CAGED table, and null
 * is a string you do not sound. Every entry is checked against the notes it
 * produces, so a wrong one cannot sit here quietly.
 */
export type Variant = {
  frets: (number | null)[];
  barre?: [number, number];
};

/** Quality as the chart writes it, after parseChord has normalised it. */
export const GRIPS: Partial<Record<ShapeName, Record<string, Variant>>> = {
  E: {
    "7": { frets: [0, 2, 0, 1, 0, 0], barre: [0, 5] },
    m7: { frets: [0, 2, 0, 0, 0, 0], barre: [0, 5] },
    maj7: { frets: [0, 2, 1, 1, 0, 0], barre: [0, 5] },
    sus4: { frets: [0, 2, 2, 2, 0, 0], barre: [0, 5] },
    sus2: { frets: [0, 2, 4, 4, 0, 0], barre: [0, 5] },
  },
  A: {
    "7": { frets: [null, 0, 2, 0, 2, 0], barre: [1, 5] },
    m7: { frets: [null, 0, 2, 0, 1, 0], barre: [1, 5] },
    maj7: { frets: [null, 0, 2, 1, 2, 0], barre: [1, 5] },
    sus4: { frets: [null, 0, 2, 2, 3, 0], barre: [1, 5] },
    sus2: { frets: [null, 0, 2, 2, 0, 0], barre: [1, 5] },
  },
  D: {
    "7": { frets: [null, null, 0, 2, 1, 2] },
    m7: { frets: [null, null, 0, 2, 1, 1] },
    maj7: { frets: [null, null, 0, 2, 2, 2] },
    sus4: { frets: [null, null, 0, 2, 3, 3] },
    sus2: { frets: [null, null, 0, 2, 3, 0] },
  },
  C: {
    "7": { frets: [null, 3, 2, 3, 1, 0] },
    maj7: { frets: [null, 3, 2, 0, 0, 0] },
  },
  G: {
    "7": { frets: [3, 2, 0, 0, 0, 1] },
  },
};

/** The pitch classes a form sounds, for checking it says what it claims. */
export function pitchesOf(frets: (number | null)[], at: number): number[] {
  const notes: number[] = [];
  frets.forEach((offset, string) => {
    if (offset === null) return;
    notes.push((((OPEN[string] + at + offset) % 12) + 12) % 12);
  });
  return [...new Set(notes)].sort((a, b) => a - b);
}

/** The notes a chord of this quality is made of, as semitones from its root. */
export const INTERVALS: Record<string, number[]> = {
  "": [0, 4, 7],
  m: [0, 3, 7],
  "7": [0, 4, 7, 10],
  m7: [0, 3, 7, 10],
  maj7: [0, 4, 7, 11],
  sus4: [0, 5, 7],
  sus2: [0, 2, 7],
};

/**
 * The form to draw for a chord, and whether it is the real thing.
 *
 * `exact` false means the quality has no form here and what comes back is the
 * triad underneath it, which the caller should say rather than hide.
 */
/** Shapes that can draw this quality properly, best-first for choosing one. */
export function shapesWith(quality: string): ShapeName[] {
  if (quality === "" || quality === "m") return [];
  return (Object.keys(GRIPS) as ShapeName[]).filter((shape) => GRIPS[shape]?.[quality]);
}

/**
 * Which form to reach for, out of the five.
 *
 * Distance to where your hand already is, mostly. But the C and G forms are
 * awkward as barre chords, which is why nobody plays them that way: a C form
 * moved up a fret is a four fret stretch with no barre to hold it. Open they
 * are the easiest chords on the guitar, so the penalty only applies once they
 * leave the nut.
 */
export function pickPosition<T extends { name: ShapeName; fret: number }>(
  positions: T[],
  anchor: number,
): T | undefined {
  const awkward = (position: T) =>
    position.fret > 0 && (position.name === "C" || position.name === "G") ? 4 : 0;
  const reach = (position: T) =>
    Math.min(Math.abs(position.fret - anchor), Math.abs(position.fret + 12 - anchor));
  return [...positions].sort((a, b) => reach(a) + awkward(a) - (reach(b) + awkward(b)))[0];
}

export function gripFor(
  shape: ShapeName,
  tonality: Tonality,
  quality: string,
): { frets: (number | null)[]; barre?: [number, number]; exact: boolean } {
  const variant = GRIPS[shape]?.[quality];
  if (variant) return { frets: variant.frets, barre: variant.barre, exact: true };
  const base = SHAPES[shape][tonality];
  return { frets: [...base.frets], barre: base.barre, exact: quality === "" || quality === "m" };
}
