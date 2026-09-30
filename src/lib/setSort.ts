import { KEYS } from "./music";
import type { Song } from "./songs";
import { keyInSet, type SetList } from "./songStore";
import { tuningOf } from "./tunings";

export type SetSort = "tuning" | "key" | "capo" | "title";

export const SET_SORTS: { value: SetSort; label: string; hint: string }[] = [
  { value: "tuning", label: "Tuning", hint: "Same tunings together, standard first, so you retune as little as possible" },
  { value: "key", label: "Key", hint: "By the key each song is played in tonight, C up to B" },
  { value: "capo", label: "Capo", hint: "No capo first, then up the neck" },
  { value: "title", label: "Title", hint: "A to Z" },
];

/**
 * A running order sorted once, by one thing. Every sort is stable, so songs that
 * tie keep the order you had them in, and a sort is a starting point to drag
 * from rather than a rule the set has to keep.
 */
export function sortSet(set: SetList, songs: Song[], by: SetSort): string[] {
  const song = (slug: string) => songs.find((entry) => entry.slug === slug);
  const entries = set.slugs.map((slug, index) => ({ slug, index, song: song(slug) }));

  // Tunings group in the order they first turn up, with standard always first.
  const firstSeen = new Map<string, number>();
  for (const entry of entries) {
    const tuning = tuningOf(entry.song?.tuning).id;
    if (!firstSeen.has(tuning)) firstSeen.set(tuning, tuning === "standard" ? -1 : entry.index);
  }

  const rank = (entry: (typeof entries)[number]): number | string => {
    if (!entry.song) return Number.MAX_SAFE_INTEGER;
    switch (by) {
      case "tuning":
        return firstSeen.get(tuningOf(entry.song.tuning).id) ?? 0;
      case "key":
        // Chromatic from C, and a key's major before its minor.
        return keyInSet(set, entry.song) * 2 + (entry.song.tonality === "minor" ? 1 : 0);
      case "capo":
        return entry.song.capo ?? 0;
      case "title":
        return entry.song.title.toLocaleLowerCase();
    }
  };

  return [...entries]
    .sort((a, b) => {
      const x = rank(a);
      const y = rank(b);
      if (x < y) return -1;
      if (x > y) return 1;
      return a.index - b.index;
    })
    .map((entry) => entry.slug);
}

/** How many times the order asks you to retune, counting from standard. */
export function retunes(slugs: string[], songs: Song[]): number {
  let current = "standard";
  let count = 0;
  for (const slug of slugs) {
    const tuning = tuningOf(songs.find((song) => song.slug === slug)?.tuning).id;
    if (tuning !== current) count++;
    current = tuning;
  }
  return count;
}

/** The key a song sounds in within this set, spelled for a row. */
export function keyLabel(set: SetList, song: Song): string {
  return `${KEYS[keyInSet(set, song)]} ${song.tonality}`;
}
