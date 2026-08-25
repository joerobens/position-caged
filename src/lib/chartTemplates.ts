import type { Tonality } from "./music";

/**
 * Chart templates.
 *
 * Most songs are three to six chords arranged in a shape you already know, so
 * typing one out from scratch is mostly retyping. These are the shapes.
 *
 * They are stored as semitones above the song's own tonic, not as numbers,
 * because the number depends on how the chart is counted: a minor song is
 * numbered from its relative major by convention, so its tonic is 6- rather
 * than 1. Storing intervals and rendering them at the last moment means one
 * definition stays right in every key, both tonalities, and either numbering.
 */
export type Step = {
  /** Semitones above the song's tonic. */
  from: number;
  /** What follows the number, in the chart's own notation. */
  quality?: string;
};

export type Template = {
  name: string;
  /** Why it is worth knowing. */
  note: string;
  tonality: Tonality;
  steps: Step[];
};

const M = "-"; // minor, as the chart writes it

export const TEMPLATES: readonly Template[] = [
  {
    name: "The four chords",
    note: "I V vi IV. The one that plays a startling number of pop songs.",
    tonality: "major",
    steps: [{ from: 0 }, { from: 7 }, { from: 9, quality: M }, { from: 5 }],
  },
  {
    name: "Three chord",
    note: "I IV V. Folk, country, early rock, most campfires.",
    tonality: "major",
    steps: [{ from: 0 }, { from: 5 }, { from: 7 }],
  },
  {
    name: "Doo-wop",
    note: "I vi IV V. Fifties ballads, and everything that borrowed from them.",
    tonality: "major",
    steps: [{ from: 0 }, { from: 9, quality: M }, { from: 5 }, { from: 7 }],
  },
  {
    name: "Sensitive",
    note: "vi IV I V. The four chords started from the minor, which changes the mood entirely.",
    tonality: "major",
    steps: [{ from: 9, quality: M }, { from: 5 }, { from: 0 }, { from: 7 }],
  },
  {
    name: "Turnaround",
    note: "ii V I. The way jazz gets home.",
    tonality: "major",
    steps: [{ from: 2, quality: M }, { from: 7 }, { from: 0 }],
  },
  {
    name: "Twelve-bar blues",
    note: "The whole form, one bar at a time.",
    tonality: "major",
    steps: [
      { from: 0 }, { from: 0 }, { from: 0 }, { from: 0 },
      { from: 5 }, { from: 5 }, { from: 0 }, { from: 0 },
      { from: 7 }, { from: 5 }, { from: 0 }, { from: 7 },
    ],
  },
  {
    name: "Minor pop",
    note: "i VI III VII. Sad and enormous.",
    tonality: "minor",
    steps: [{ from: 0, quality: M }, { from: 8 }, { from: 3 }, { from: 10 }],
  },
  {
    name: "Andalusian",
    note: "i VII VI V. The flamenco walk down.",
    tonality: "minor",
    steps: [{ from: 0, quality: M }, { from: 10 }, { from: 8 }, { from: 7 }],
  },
  {
    name: "Natural minor",
    note: "i iv v. Minor with nothing borrowed.",
    tonality: "minor",
    steps: [{ from: 0, quality: M }, { from: 5, quality: M }, { from: 7, quality: M }],
  },
  {
    name: "Minor blues",
    note: "The twelve bars, in a minor key.",
    tonality: "minor",
    steps: [
      { from: 0, quality: M }, { from: 0, quality: M }, { from: 0, quality: M }, { from: 0, quality: M },
      { from: 5, quality: M }, { from: 5, quality: M }, { from: 0, quality: M }, { from: 0, quality: M },
      { from: 7, quality: M }, { from: 5, quality: M }, { from: 0, quality: M }, { from: 7, quality: M },
    ],
  },
];

const SCALE: Record<Tonality, number[]> = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
};

/**
 * A semitone offset written as the chart would write it.
 *
 * `relative` shifts by nine because a minor tonic sits a sixth above its
 * relative major, which is exactly why minor charts start on 6.
 */
export function degreeToken(from: number, quality: string, steps: Tonality, relative: boolean): string {
  const offset = (((from + (relative ? 9 : 0)) % 12) + 12) % 12;
  const scale = SCALE[steps];
  const exact = scale.indexOf(offset);
  if (exact >= 0) return `${exact + 1}${quality}`;
  // Not in the scale, so name it against the degree below and flatten the one above.
  const above = scale.findIndex((step) => step > offset);
  if (above > 0) return `b${above + 1}${quality}`;
  return `b1${quality}`;
}

/** The template as a line of bars, ready to drop into a chart. */
export function templateBars(template: Template, steps: Tonality, relative: boolean): string {
  return template.steps.map((step) => degreeToken(step.from, step.quality ?? "", steps, relative)).join(" ");
}

/** Verse, then Chorus, then Bridge, then honest numbering. */
export function nextSectionName(existing: number): string {
  return ["Verse", "Chorus", "Bridge"][existing] ?? `Section ${existing + 1}`;
}
