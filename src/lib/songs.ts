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
    chart: [{ name: "Verse", bars: ["1m", "1m", "4m", "1m", "1m", "3", "5", "1m"] }],
    note: "Minor, and the one place the app's minor shapes earn their keep. The 3 in bar six is the relative major arriving and then leaving again.",
  },
  {
    slug: "shady-grove",
    title: "Shady Grove",
    credit: "traditional",
    root: 2,
    tonality: "minor",
    feel: "driving",
    bpm: 112,
    chart: [{ name: "Verse", bars: ["1m", "1m", "b7", "b7", "1m", "1m", "b7", "1m"] }],
    note: "Modal rather than minor: the b7 where you expect a 5. Worth having because it breaks the habit of always resolving the same way.",
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
