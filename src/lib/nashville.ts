import { KEYS, type Tonality } from "./music";
import type { Song } from "./songs";

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
  /** The token as written, e.g. "4", "6m", "b7", "1/3". */
  raw: string;
  /** Semitones above the tonic. */
  offset: number;
  /** What to add after the letter when spelling the chord. */
  suffix: string;
  /** Semitones above the tonic for the bass note of a slash chord. */
  bass: number | null;
  /** A bar with nothing new in it. */
  hold: boolean;
};

/**
 * The qualities a Nashville chart uses. The symbols on the right of each pair are
 * the ones the system itself uses: a dash for minor, a triangle for a major
 * seventh, a circle for diminished, a slashed circle for half diminished.
 */
const SUFFIXES: Record<string, string> = {
  "": "",
  m: "m",
  min: "m",
  "-": "m",
  "7": "7",
  m7: "m7",
  "-7": "m7",
  min7: "m7",
  maj7: "maj7",
  "^": "maj7",
  "\u0394": "maj7",
  "\u03947": "maj7",
  "6": "6",
  "9": "9",
  a2: "add9",
  a9: "add9",
  sus: "sus4",
  sus2: "sus2",
  sus4: "sus4",
  dim: "dim",
  o: "dim",
  o7: "dim7",
  "\u00b0": "dim",
  "\u00b07": "dim7",
  dim7: "dim7",
  "\u00f8": "m7b5",
  "\u00f87": "m7b5",
  aug: "aug",
  "+": "aug",
};

/** How far above the tonic a degree sits, honouring a leading flat or sharp. */
function degreeOffset(accidental: string, degree: string, tonality: Tonality): number {
  const step = STEPS[tonality][Number(degree) - 1];
  const shift = accidental === "b" ? -1 : accidental === "#" ? 1 : 0;
  return (((step + shift) % 12) + 12) % 12;
}

/**
 * "b6m7" or "1/3" becomes an offset, a suffix and possibly a bass note. A slash
 * means an inversion, as it does in ordinary chord notation, so it cannot also
 * mean a held bar: that is what the diamond, or here a percent, is for.
 */
export function parseChord(raw: string, tonality: Tonality): ChordToken | null {
  // Charts are written with the real accidentals; keyboards produce the ASCII ones.
  const token = raw.trim().replace(/\u266d/g, "b").replace(/\u266f/g, "#");
  if (!token || token === "%") return { raw: token, offset: 0, suffix: "", bass: null, hold: true };

  const [chordPart, bassPart] = token.split("/");
  const match = /^([b#]?)([1-7])(.*)$/.exec(chordPart);
  if (!match) return null;
  const [, accidental, degree, rest] = match;

  let bass: number | null = null;
  if (bassPart !== undefined) {
    const bassMatch = /^([b#]?)([1-7])$/.exec(bassPart.trim());
    if (!bassMatch) return null;
    bass = degreeOffset(bassMatch[1], bassMatch[2], tonality);
  }

  // Look the quality up as written first: lowercasing would turn a major seventh
  // triangle into a different character altogether.
  const suffix = SUFFIXES[rest] ?? SUFFIXES[rest.toLowerCase()] ?? rest;
  return { raw: raw.trim(), offset: degreeOffset(accidental, degree, tonality), suffix, bass, hold: false };
}

/** What this token is called in a given key. */
export function chordName(token: ChordToken, root: number): string {
  if (token.hold) return token.raw;
  const name = `${KEYS[(root + token.offset) % 12]}${token.suffix}`;
  return token.bass === null ? name : `${name}/${KEYS[(root + token.bass) % 12]}`;
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

/**
 * Which key a chart is counted from.
 *
 * A minor key song is conventionally written in the numbers of its relative
 * major, so an A minor song is a 6- rather than a 1-. Sweetwater puts it
 * plainly: writing it as a 1- is possible but "it will make more sense to the
 * greatest percentage of musicians reading your chart" the other way. A song
 * can opt out with numbering: "tonic" if the tonic reading is clearer for it.
 */
export function numberingOf(song: Pick<Song, "root" | "tonality" | "numbering">): {
  root: number;
  steps: Tonality;
  relative: boolean;
} {
  if (song.tonality === "minor" && song.numbering !== "tonic") {
    return { root: (song.root + 3) % 12, steps: "major", relative: true };
  }
  return { root: song.root, steps: song.tonality, relative: false };
}
