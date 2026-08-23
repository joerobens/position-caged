import { KEYS, type Tonality } from "./music";

/**
 * Nashville numbers: a chart written in scale degrees rather than chord names, so
 * one chart plays in every key. The degree is counted through the scale of the
 * song's own tonality, which is why 3 is C in A minor but C# in A major.
 */
const STEPS: Record<Tonality, number[]> = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
};

export type ChordToken = {
  /** The token as written, e.g. "4", "6m", "b7", "5(7)". */
  raw: string;
  /** Semitones above the tonic. */
  offset: number;
  /** What to add after the letter when spelling the chord. */
  suffix: string;
  /** A bar with nothing new in it. */
  hold: boolean;
};

const SUFFIXES: Record<string, string> = {
  "": "",
  m: "m",
  min: "m",
  "-": "m",
  "7": "7",
  m7: "m7",
  min7: "m7",
  maj7: "maj7",
  "6": "6",
  "9": "9",
  sus: "sus4",
  sus2: "sus2",
  sus4: "sus4",
  dim: "dim",
  o: "dim",
  aug: "aug",
};

/** "b6m7" becomes an offset and a suffix. Anything unparsed is left as written. */
export function parseChord(raw: string, tonality: Tonality): ChordToken | null {
  const token = raw.trim();
  if (!token || token === "/" || token === "%") return { raw: token, offset: 0, suffix: "", hold: true };
  const match = /^([b#]?)([1-7])(.*)$/.exec(token);
  if (!match) return null;
  const [, accidental, degree, rest] = match;
  const step = STEPS[tonality][Number(degree) - 1];
  const shift = accidental === "b" ? -1 : accidental === "#" ? 1 : 0;
  const suffix = SUFFIXES[rest.toLowerCase()] ?? rest;
  return { raw: token, offset: (((step + shift) % 12) + 12) % 12, suffix, hold: false };
}

/** What this token is called in a given key. */
export function chordName(token: ChordToken, root: number): string {
  if (token.hold) return token.raw;
  return `${KEYS[(root + token.offset) % 12]}${token.suffix}`;
}

/** Every distinct chord in a chart, in the order it first appears. */
export function chartChords(bars: string[], tonality: Tonality): ChordToken[] {
  const seen = new Set<string>();
  const out: ChordToken[] = [];
  for (const bar of bars) {
    for (const raw of bar.split(/\s+/)) {
      const token = parseChord(raw, tonality);
      if (!token || token.hold || seen.has(token.raw)) continue;
      seen.add(token.raw);
      out.push(token);
    }
  }
  return out;
}

/** The chart as semitone offsets, one per bar, for handing to the practice tool. */
export function barOffsets(bars: string[], tonality: Tonality): number[] {
  let last = 0;
  return bars.map((bar) => {
    const first = bar.split(/\s+/)[0];
    const token = parseChord(first, tonality);
    if (!token || token.hold) return last;
    last = token.offset;
    return token.offset;
  });
}
