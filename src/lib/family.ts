import { KEYS, type Tonality } from "./music";

/**
 * The chords a key is made of.
 *
 * Build a triad on each degree of the scale using only notes from that scale
 * and you get seven chords, and their qualities are not a matter of taste:
 * stack thirds on the first degree of a major scale and a major chord falls
 * out, do it on the second and a minor one does. That is why every major key
 * has the same shape of family, and why knowing it once means knowing it in
 * all twelve.
 */
export type FamilyChord = {
  /** 1 to 7. */
  degree: number;
  /** How it is written in analysis: I, ii, V, vii°. */
  roman: string;
  /** Semitones above the tonic. */
  offset: number;
  quality: "" | "m" | "dim";
  /** How a chart in this key would write it. */
  token: string;
  /** What it is called in the key given. */
  name: string;
  /** What the degree does, in one phrase. */
  job: string;
};

const SCALE: Record<Tonality, number[]> = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
};

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII"];

const JOB: Record<Tonality, string[]> = {
  major: [
    "home",
    "leans toward the five",
    "the softer home",
    "away from home, and warm about it",
    "the pull back",
    "the relative minor, home with the light off",
    "unstable, and rarely used on its own",
  ],
  minor: [
    "home",
    "unstable, and rarely used on its own",
    "the relative major, home with the light on",
    "away from home",
    "the pull back, minor unless you raise it",
    "the warm one",
    "the walk down from home, and the way back up",
  ],
};

/**
 * The quality of a triad built on each degree, which follows from the scale
 * rather than being chosen: third and fifth above, both taken from the key.
 */
function qualityOf(scale: number[], degree: number): "" | "m" | "dim" {
  const at = (step: number) => scale[(degree + step) % 7] + (degree + step >= 7 ? 12 : 0);
  const third = (at(2) - at(0) + 12) % 12;
  const fifth = (at(4) - at(0) + 12) % 12;
  if (third === 4 && fifth === 7) return "";
  if (third === 3 && fifth === 7) return "m";
  if (third === 3 && fifth === 6) return "dim";
  return third === 4 ? "" : "m";
}

/**
 * The seven chords of a key.
 *
 * `numbering` is how the chart counts: a minor song is numbered from its
 * relative major by convention, so the tokens have to agree with that or the
 * family will not match the charts it is supposed to explain.
 */
export function chordFamily(
  root: number,
  tonality: Tonality,
  numbering: { root: number; steps: Tonality } = { root, steps: tonality },
): FamilyChord[] {
  const scale = SCALE[tonality];
  const counting = SCALE[numbering.steps];

  return scale.map((offset, index) => {
    const quality = qualityOf(scale, index);
    const pitch = (root + offset) % 12;

    // Written against whatever root the chart counts from.
    const fromCounting = (((pitch - numbering.root) % 12) + 12) % 12;
    const exact = counting.indexOf(fromCounting);
    const degree = exact >= 0 ? String(exact + 1) : `b${counting.findIndex((s) => s > fromCounting) + 1}`;
    const suffix = quality === "m" ? "-" : quality === "dim" ? "°" : "";

    const roman = quality === "" ? ROMAN[index] : ROMAN[index].toLowerCase();
    return {
      degree: index + 1,
      roman: quality === "dim" ? `${roman}°` : roman,
      offset,
      quality,
      token: `${degree}${suffix}`,
      name: `${KEYS[pitch]}${quality === "m" ? "m" : quality === "dim" ? "dim" : ""}`,
      job: JOB[tonality][index],
    };
  });
}
