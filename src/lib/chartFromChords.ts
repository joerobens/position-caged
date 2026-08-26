import type { Tonality } from "./music";

/**
 * Turning a fetched chord chart into one of ours.
 *
 * Three jobs. Work out what key the shapes are in, because a tab names chords
 * and we count degrees. Fold the repeats, because ninety four bars of a four
 * bar loop is not a chart anybody reads. And write each chord as a degree, so
 * it survives being moved to another key, which is the whole point of the
 * numbers.
 */

const NAMES: Record<string, number> = {
  C: 0, "C#": 1, DB: 1, D: 2, "D#": 3, EB: 3, E: 4, FB: 4, F: 5, "E#": 5,
  "F#": 6, GB: 6, G: 7, "G#": 8, AB: 8, A: 9, "A#": 10, BB: 10, B: 11, CB: 11,
};

const STEPS: Record<Tonality, number[]> = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
};

/** Quality as a tab writes it, mapped to what our charts accept. */
const QUALITY: [RegExp, string][] = [
  [/^maj7|^M7|^Δ/, "maj7"],
  [/^m7b5|^ø/, "ø"],
  [/^dim7|^°7/, "°7"],
  [/^dim|^°/, "°"],
  [/^aug|^\+/, "+"],
  // Before the plain minor rule, or the seventh is dropped on the floor.
  [/^(m|min|-)7/, "-7"],
  [/^m(?!aj)|^min|^-/, "-"],
  [/^sus2/, "sus2"],
  [/^sus4|^sus/, "sus"],
  [/^add9|^add2/, "a9"],
  // A chart has no way to write 7sus4, and the seventh is the louder half.
  [/^7/, "7"],
  [/^6/, "6"],
  [/^9/, "9"],
];

export type ParsedChord = { root: number; quality: string; bass: number | null; minor: boolean };

/** "Em7", "Cadd9", "Gsus2/F#" into something we can count. */
export function readChord(text: string): ParsedChord | null {
  const clean = text.trim().replace(/♭/g, "b").replace(/♯/g, "#");
  const match = /^([A-Ga-g])([#b]?)(.*)$/.exec(clean);
  if (!match) return null;
  const [, letter, accidental, rest] = match;
  const root = NAMES[(letter.toUpperCase() + accidental.toUpperCase()) as keyof typeof NAMES];
  if (root === undefined) return null;

  const [body, over] = rest.split("/");
  let bass: number | null = null;
  if (over) {
    const bassMatch = /^([A-Ga-g])([#b]?)/.exec(over.trim());
    const found = bassMatch ? NAMES[(bassMatch[1].toUpperCase() + bassMatch[2].toUpperCase()) as keyof typeof NAMES] : undefined;
    bass = found ?? null;
  }

  let quality = "";
  for (const [pattern, as] of QUALITY) {
    if (pattern.test(body)) {
      quality = as;
      break;
    }
  }
  return { root, quality, bass, minor: /^-/.test(quality) || quality === "ø" || quality === "°" };
}

/**
 * Which key these shapes are in.
 *
 * Scores every key by how much of the chart it explains, weighted by how often
 * each chord appears, with a nudge for a chart that starts and ends on the
 * tonic because most do.
 */
export function guessKey(chords: ParsedChord[]): { root: number; tonality: Tonality } {
  const weight = new Map<number, number>();
  for (const chord of chords) weight.set(chord.root, (weight.get(chord.root) ?? 0) + 1);

  let best = { root: 0, tonality: "major" as Tonality, score: -Infinity };
  for (let root = 0; root < 12; root++) {
    for (const tonality of ["major", "minor"] as Tonality[]) {
      const scale = STEPS[tonality].map((step) => (root + step) % 12);
      let score = 0;
      for (const [pitch, count] of weight) score += scale.includes(pitch) ? count : -count * 1.5;
      // The tonic chord should also be the right flavour.
      const tonic = chords.find((chord) => chord.root === root);
      if (tonic) score += tonic.minor === (tonality === "minor") ? 2 : -2;
      if (chords[0]?.root === root) score += 2;
      if (chords[chords.length - 1]?.root === root) score += 1;
      if (score > best.score) best = { root, tonality, score };
    }
  }
  return { root: best.root, tonality: best.tonality };
}

/** A chord as a degree of the given key, e.g. "6-7" or "b7". */
export function asDegree(chord: ParsedChord, root: number, tonality: Tonality): string {
  const offset = (((chord.root - root) % 12) + 12) % 12;
  const scale = STEPS[tonality];
  const exact = scale.indexOf(offset);
  let degree: string;
  if (exact >= 0) degree = String(exact + 1);
  else {
    const above = scale.findIndex((step) => step > offset);
    degree = above > 0 ? `b${above + 1}` : "b1";
  }
  let token = `${degree}${chord.quality}`;
  if (chord.bass !== null && chord.bass !== chord.root) {
    const bassOffset = (((chord.bass - root) % 12) + 12) % 12;
    const bassExact = scale.indexOf(bassOffset);
    if (bassExact >= 0) token += `/${bassExact + 1}`;
  }
  return token;
}

/**
 * Fold a long sequence into sections.
 *
 * Songs repeat, so the chart is mostly the same few bars over and over. This
 * finds the shortest block that repeats from where it stands, writes it once,
 * and moves on. What comes out is the shape of the song rather than a
 * transcript of every bar in it.
 */
export function fold(bars: string[]): { name: string; bars: string[] }[] {
  const sections: { name: string; bars: string[] }[] = [];
  const names = ["Verse", "Chorus", "Bridge", "Part 4", "Part 5", "Part 6"];
  // A chart is the shape of a song, not a transcript of it. A tab may hold one
  // chord for thirty bars; four says the same thing and still fits on a stand.
  const MAX_HOLD = 4;
  const MAX_BARS = 16;
  let at = 0;

  /** The same chord bar after bar is one chord held, which is what % means. */
  const hold = (bar: string, count: number) => [bar, ...Array(Math.max(0, count - 1)).fill("%")];

  while (at < bars.length) {
    let period = 0;
    let repeats = 1;
    for (let size = 1; size <= 8 && at + size * 2 <= bars.length; size++) {
      let count = 1;
      while (
        at + (count + 1) * size <= bars.length &&
        bars.slice(at, at + size).every((bar, i) => bar === bars[at + count * size + i])
      ) {
        count++;
      }
      if (count > 1 && count * size > period * repeats) {
        period = size;
        repeats = count;
      }
    }

    // One chord, over and over. That is not a section of its own: it is the
    // section before it carrying on, which is how anyone would write it down.
    if (period === 1 && repeats > 1) {
      const count = Math.min(repeats, MAX_HOLD);
      const last = sections[sections.length - 1];
      if (last && last.bars.length < MAX_BARS) {
        // Carrying on the chord the section ended on is all holds, no restatement.
        const held = lastReal(last.bars) === bars[at] ? Array(count).fill("%") : hold(bars[at], count);
        last.bars.push(...held.slice(0, MAX_BARS - last.bars.length));
      }
      else if (sections.length < names.length) {
        // The section before it is full, so this carries on under a new name.
        sections.push({ name: names[sections.length], bars: hold(bars[at], count) });
      }
      at += repeats;
      continue;
    }

    if (sections.length >= names.length) break;

    if (period === 0) {
      // Nothing repeats from here, so take a sensible run and carry on.
      period = Math.min(8, bars.length - at);
      repeats = 1;
    }
    period = Math.min(period, MAX_BARS);

    // Within the block itself, a chord that holds is written as a hold.
    const block: string[] = [];
    for (const bar of bars.slice(at, at + period)) {
      block.push(block.length > 0 && bar === lastReal(block) ? "%" : bar);
    }

    const previous = sections[sections.length - 1];
    if (previous && previous.bars.join(" ") === block.join(" ")) {
      at += period * repeats;
      continue; // the same block again, and it is already written down
    }
    sections.push({ name: names[sections.length], bars: block });
    at += period * repeats;
  }
  return sections;
}

/** The last bar that named a chord, looking past any holds. */
function lastReal(bars: string[]): string | null {
  for (let i = bars.length - 1; i >= 0; i--) if (bars[i] !== "%") return bars[i];
  return null;
}

export function toSong(bars: string[][], capo: number): {
  root: number;
  tonality: Tonality;
  capo: number;
  numbering: "relative-major" | "tonic";
  chart: { name: string; bars: string[] }[];
} | null {
  const flat = bars.flat();
  const parsed = flat.map(readChord).filter((chord): chord is ParsedChord => chord !== null);
  if (parsed.length < 2) return null;

  const shape = guessKey(parsed);
  // Counted the way the app will count it: minor charts run off the relative major.
  const relative = shape.tonality === "minor";
  const countingRoot = relative ? (shape.root + 3) % 12 : shape.root;
  const steps: Tonality = relative ? "major" : shape.tonality;

  const tokens = flat.map((text) => {
    const chord = readChord(text);
    return chord ? asDegree(chord, countingRoot, steps) : text;
  });

  return {
    // The song is stored in the key it sounds in; the capo does the rest.
    root: (shape.root + capo) % 12,
    tonality: shape.tonality,
    capo,
    // Said outright rather than left to the default. The degrees above were
    // written against one particular root, and if the tonality is changed
    // later the default would start counting them from somewhere else and
    // every chord on the page would quietly move.
    numbering: relative ? "relative-major" : "tonic",
    chart: fold(tokens),
  };
}
