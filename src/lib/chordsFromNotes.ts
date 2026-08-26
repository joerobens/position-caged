/**
 * Chords worked out from the notes.
 *
 * Most tabs have no chord names on them: whether a transcriber typed them is
 * arbitrary, and no field says which did. But every tab has the notes, and the
 * notes spell the chords, so they can be read rather than looked up.
 *
 * Pitches are the shapes under your fingers, capo excluded, because that is
 * what a chord name over a tab means and what the rest of the chart expects.
 */

const NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

/** Intervals from the root, and what to call it. Order breaks ties toward the plain ones. */
const SHAPES: { name: string; tones: number[]; weight: number[] }[] = [
  { name: "", tones: [0, 4, 7], weight: [3, 3, 1] },
  { name: "m", tones: [0, 3, 7], weight: [3, 3, 1] },
  { name: "7", tones: [0, 4, 7, 10], weight: [3, 2, 1, 3] },
  { name: "m7", tones: [0, 3, 7, 10], weight: [3, 2, 1, 3] },
  { name: "maj7", tones: [0, 4, 7, 11], weight: [3, 2, 1, 3] },
  { name: "sus4", tones: [0, 5, 7], weight: [3, 3, 1] },
  { name: "sus2", tones: [0, 2, 7], weight: [3, 3, 1] },
  { name: "6", tones: [0, 4, 7, 9], weight: [3, 2, 1, 2] },
  { name: "m6", tones: [0, 3, 7, 9], weight: [3, 2, 1, 2] },
  { name: "add9", tones: [0, 2, 4, 7], weight: [3, 2, 2, 1] },
  { name: "dim", tones: [0, 3, 6], weight: [3, 3, 3] },
  { name: "m7b5", tones: [0, 3, 6, 10], weight: [3, 2, 2, 2] },
  { name: "aug", tones: [0, 4, 8], weight: [3, 3, 3] },
  { name: "5", tones: [0, 7], weight: [3, 2] },
];

export type Sounding = {
  /** How much of each pitch class is present. */
  weight: Map<number, number>;
  /** The lowest note heard, which is usually the root and always a clue. */
  bass: number | null;
};

/**
 * The best name for what is sounding.
 *
 * Every root against every shape: reward the chord tones that are there,
 * penalise the ones that are not and the notes that do not belong, and lean on
 * the bass, because a guitar part almost always puts the root underneath.
 */
export function nameOf(sounding: Sounding, minNotes = 2): string | null {
  const { weight, bass } = sounding;
  if (weight.size < minNotes) return null;
  const total = [...weight.values()].reduce((sum, n) => sum + n, 0);
  if (!total) return null;

  let best: { name: string; score: number } | null = null;
  for (let root = 0; root < 12; root++) {
    for (let s = 0; s < SHAPES.length; s++) {
      const shape = SHAPES[s];
      const tones = shape.tones.map((tone) => (root + tone) % 12);

      // A fingerpicked bar often just misses the third. That is not a sus
      // chord, so the suspended note has to be carrying real weight to earn
      // the name rather than merely being present in passing.
      if (shape.name === "sus4" || shape.name === "sus2") {
        const colour = weight.get((root + (shape.name === "sus4" ? 5 : 2)) % 12) ?? 0;
        if (colour / total < 0.15) continue;
      }

      // How much of what is sounding this chord accounts for. Proportion, not
      // raw count: a passing note struck eight times is still one wrong note.
      let explained = 0;
      for (const [pitch, count] of weight) if (tones.includes(pitch)) explained += count;
      const fit = explained / total;

      // Chord tones that are not there. A missing third changes the chord; a
      // missing fifth barely registers, which is why guitarists drop it.
      let missing = 0;
      shape.tones.forEach((tone, i) => {
        if (!weight.has((root + tone) % 12)) missing += shape.weight[i];
      });

      let score = fit * 100 - missing * 6;
      // A guitar part almost always puts the root at the bottom.
      if (bass !== null && ((bass % 12) + 12) % 12 === root) score += 14;
      // Between two names for the same notes, the plainer one is the better one.
      score -= s * 0.6 + shape.tones.length * 0.8;

      if (!best || score > best.score) best = { name: NAMES[root] + shape.name, score };
    }
  }
  return best && best.score > 55 ? best.name : null;
}

type Note = { fret?: number; string?: number };
type Beat = { notes?: Note[]; chord?: { text?: string } };
type Measure = { voices?: { beats?: Beat[] }[] };

function gather(beats: Beat[], tuning: number[]): Sounding {
  const weight = new Map<number, number>();
  let bass: number | null = null;
  for (const beat of beats) {
    for (const note of beat.notes ?? []) {
      if (typeof note.fret !== "number" || typeof note.string !== "number") continue;
      const open = tuning[note.string];
      if (typeof open !== "number") continue;
      const pitch = open + note.fret;
      const pc = ((pitch % 12) + 12) % 12;
      weight.set(pc, (weight.get(pc) ?? 0) + 1);
      if (bass === null || pitch < bass) bass = pitch;
    }
  }
  return { weight, bass };
}

/**
 * A chord per bar, or two where the bar plainly changes halfway, which is
 * common enough that ignoring it would flatten a lot of songs.
 */
export function chordsFromNotes(measures: Measure[], tuning: number[]): string[][] {
  return measures.map((measure) => {
    const beats = (measure.voices ?? []).flatMap((voice) => voice.beats ?? []);
    if (!beats.length) return [];

    // Quarters rather than halves: a bar often turns over somewhere other than
    // its middle, and a half-split hears one chord where there are two.
    const segments = Math.min(4, beats.length);
    const size = Math.ceil(beats.length / segments);
    const found: string[] = [];
    for (let at = 0; at < beats.length; at += size) {
      const name = nameOf(gather(beats.slice(at, at + size), tuning));
      // A chord held across two quarters is one chord, not two, and a chord that
      // comes back later in the same bar is the arpeggio turning over, not a change.
      if (name && !found.includes(name)) found.push(name);
    }

    const rootOf = (name: string) => /^[A-G][#b]?/.exec(name)?.[0] ?? name;
    const changes = found.filter(
      (name, i) => i === 0 || rootOf(name) !== rootOf(found[i - 1]),
    );
    // Two to a bar is as fine as a chart usefully gets.
    if (changes.length) return changes.slice(0, 2);
    const whole = nameOf(gather(beats, tuning));
    return whole ? [whole] : [];
  });
}

/**
 * Settle a derived chart against its own key.
 *
 * A chord with no third in it is not a suspended chord, it is a bar where the
 * third had not been picked yet, and calling it Ebsus2 is a worse guess than
 * calling it Eb. So once the whole song has been read, the key it is in
 * decides those: a root that belongs to the scale takes the quality the scale
 * gives it. Chords that did state a third are left exactly as they were.
 */
const MAJOR = [0, 2, 4, 5, 7, 9, 11];
const QUALITY_OF_DEGREE = ["", "m", "m", "", "", "m", "dim"];
const VAGUE = /^(sus2|sus4|5|add9)$/;

export function settle(bars: string[][]): string[][] {
  const rootOf = (name: string) => NAMES.indexOf(/^[A-G]#?/.exec(name)?.[0] ?? "");
  const tailOf = (name: string) => name.replace(/^[A-G]#?/, "");

  // Which key explains the most of what was heard.
  const weight = new Map<number, number>();
  for (const bar of bars) {
    for (const name of bar) {
      const root = rootOf(name);
      if (root >= 0) weight.set(root, (weight.get(root) ?? 0) + 1);
    }
  }
  let key = 0;
  let bestScore = -Infinity;
  for (let candidate = 0; candidate < 12; candidate++) {
    const scale = MAJOR.map((step) => (candidate + step) % 12);
    let score = 0;
    for (const [pitch, count] of weight) score += scale.includes(pitch) ? count : -count * 1.5;
    if (score > bestScore) {
      bestScore = score;
      key = candidate;
    }
  }

  const scale = MAJOR.map((step) => (key + step) % 12);
  return bars.map((bar) =>
    bar.map((name) => {
      const tail = tailOf(name);
      if (!VAGUE.test(tail)) return name;
      const root = rootOf(name);
      const degree = scale.indexOf(root);
      // Not in the key, so the tab knows better than the scale does.
      if (degree < 0) return name;
      return NAMES[root] + QUALITY_OF_DEGREE[degree];
    }),
  );
}
