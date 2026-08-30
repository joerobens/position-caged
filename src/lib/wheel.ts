import { KEYS } from "./music";

/**
 * The chord family, arranged as a wheel.
 *
 * Twelve keys around a ring, each a fifth from the last, with every key's
 * relative minor sitting directly inside it. Arranged that way, a key's six
 * chords stop being a list to memorise and become three neighbouring slices:
 * the key itself, the one before it, the one after, and the three minors under
 * them. Turn the ring one notch and you are in the next key with the same
 * shape of family, which is the whole reason the diagram is worth having.
 */

/** Twelve positions, a fifth apart, starting at C. */
export const FIFTHS = Array.from({ length: 12 }, (_, i) => (i * 7) % 12);

export type Slice = {
  /** Where it sits on the ring, 0 to 11 clockwise from the top. */
  at: number;
  major: number;
  minor: number;
  majorName: string;
  minorName: string;
};

export const RING: Slice[] = FIFTHS.map((pitch, at) => ({
  at,
  major: pitch,
  // The relative minor is a minor third below, which is nine semitones up.
  minor: (pitch + 9) % 12,
  majorName: KEYS[pitch],
  minorName: `${KEYS[(pitch + 9) % 12]}m`,
}));

/** Where a key sits on the ring. A minor key sits at its relative major. */
export function positionOf(root: number, tonality: "major" | "minor"): number {
  const major = tonality === "minor" ? (root + 3) % 12 : root;
  return FIFTHS.indexOf(major);
}

export type WheelChord = {
  /** The chord, and where it sits. */
  at: number;
  ring: "major" | "minor";
  root: number;
  name: string;
  /** Its degree in the key, e.g. IV or vi. */
  roman: string;
  degree: string;
};

/**
 * The six chords of a key, as three slices of the ring.
 *
 * Not computed from a scale here: read straight off the wheel, which is the
 * point being made. That they agree with the scale is checked rather than
 * assumed.
 */
export function familyOn(position: number): WheelChord[] {
  const romans: [number, string, string, string, string][] = [
    // offset from the key's slice, roman for the major, its degree, roman for
    // the minor beneath it, its degree
    [-1, "IV", "4", "ii", "2-"],
    [0, "I", "1", "vi", "6-"],
    [1, "V", "5", "iii", "3-"],
  ];
  return romans.flatMap(([offset, majorRoman, majorDegree, minorRoman, minorDegree]) => {
    const slice = RING[(((position + offset) % 12) + 12) % 12];
    return [
      { at: slice.at, ring: "major" as const, root: slice.major, name: slice.majorName, roman: majorRoman, degree: majorDegree },
      { at: slice.at, ring: "minor" as const, root: slice.minor, name: slice.minorName, roman: minorRoman, degree: minorDegree },
    ];
  });
}
