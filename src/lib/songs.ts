import type { Tonality } from "./music";

export type ChartSection = {
  name: string;
  /** One entry per bar, in Nashville numbers. "%" or "/" holds the previous chord. */
  bars: string[];
};

export type Song = {
  slug: string;
  title: string;
  /** "traditional" for the seeded ones, or whoever you learned it from. */
  credit: string;
  root: number;
  tonality: Tonality;
  capo?: number;
  feel?: string;
  bpm?: number;
  chart: ChartSection[];
  /**
   * How the chart is numbered. Minor songs default to the numbers of their
   * relative major, which is the convention; "tonic" counts from the song's own
   * root instead.
   */
  numbering?: "relative-major" | "tonic";
  /** Why it is worth having in here. */
  note?: string;
};

/**
 * The seeded library ships charts and nothing else. A chord progression is not
 * anyone's property and it is the part you actually need on a stand; lyrics are
 * yours to paste in, and they stay in your browser rather than in the repo.
 *
 * These are all traditional, chosen for distinct progressions rather than for
 * being famous: a modal one, a two chord one, a plain I IV V, and the form.
 */
export const SEEDED_SONGS: Song[] = [
  {
    slug: "twelve-bar-blues",
    title: "Twelve bar blues",
    credit: "the form itself",
    root: 0,
    tonality: "major",
    feel: "shuffle",
    bpm: 84,
    chart: [
      { name: "Form", bars: ["1", "1", "1", "1", "4", "4", "1", "1", "5", "4", "1", "5"] },
      { name: "Quick change", bars: ["1", "4", "1", "1", "4", "4", "1", "1", "5", "4", "1", "5"] },
    ],
    note: "Not a song, the frame most of them hang on. Learn it in numbers once and it plays in every key.",
  },
  {
    slug: "wildwood-flower",
    title: "Wildwood Flower",
    credit: "traditional",
    root: 0,
    tonality: "major",
    feel: "straight, boom chick",
    bpm: 96,
    chart: [{ name: "Verse", bars: ["1", "1", "1", "1", "1", "5", "1", "1"] }],
    note: "Two chords and a melody that sits under them. The one to play when you are working on the picking hand rather than the fretting one.",
  },
  {
    slug: "will-the-circle-be-unbroken",
    title: "Will the Circle Be Unbroken",
    credit: "traditional",
    root: 7,
    tonality: "major",
    feel: "straight",
    bpm: 100,
    chart: [
      { name: "Verse", bars: ["1", "1", "4", "1", "1", "5", "1", "1"] },
      { name: "Chorus", bars: ["1", "1", "4", "1", "1", "5", "1", "1"] },
    ],
    note: "A plain I IV V in G. Good for hearing how the IV and the V actually behave, because nothing else is going on.",
  },
  {
    slug: "wayfaring-stranger",
    title: "Wayfaring Stranger",
    credit: "traditional",
    root: 9,
    tonality: "minor",
    feel: "slow, free",
    bpm: 68,
    chart: [{ name: "Verse", bars: ["6-", "6-", "2-", "6-", "6-", "1", "3", "6-"] }],
    note: "Minor, so it is written in the numbers of its relative major: the 6- is the A minor you are actually sitting on. The 3 in bar six is a major chord standing in for a 5, which is what minor key songs do.",
  },
  {
    slug: "shady-grove",
    title: "Shady Grove",
    credit: "traditional",
    root: 2,
    tonality: "minor",
    feel: "driving",
    bpm: 112,
    chart: [{ name: "Verse", bars: ["6-", "6-", "5", "5", "6-", "6-", "5", "6-"] }],
    note: "Modal rather than minor. Counted from its relative major it is just a 6- and a 5, which is the clearest sign that the chord you keep landing on is not the one the numbers call home.",
  },
  {
    slug: "amazing-grace",
    title: "Amazing Grace",
    credit: "traditional",
    root: 7,
    tonality: "major",
    feel: "3/4, slow",
    bpm: 72,
    chart: [{ name: "Verse", bars: ["1", "1", "4", "1", "1", "5", "1", "1", "4", "1", "5", "1"] }],
    note: "In three, which most practice material is not. Useful purely for that.",
  },
];

export function findSeeded(slug: string): Song | undefined {
  return SEEDED_SONGS.find((song) => song.slug === slug);
}
