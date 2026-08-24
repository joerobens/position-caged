import { SEEDED_SONGS, type Song } from "./songs";

/**
 * Your half of the library. Lyrics you paste and songs you add live here, in the
 * browser, and are never committed: the repo is public, and words are somebody's
 * property in a way a chord progression is not.
 */
/** An ordered list of songs, for playing straight through. */
export type SetList = {
  id: string;
  name: string;
  /** Song slugs, in the order you play them. */
  slugs: string[];
  note?: string;
};

export type Library = {
  /** Lyrics keyed by song slug. */
  lyrics: Record<string, string>;
  /** Songs you added yourself. */
  own: Song[];
  /** Sets you have put together. */
  sets: SetList[];
};

const KEY = "position:songs:v1";
const EMPTY: Library = { lyrics: {}, own: [], sets: [] };

let cache: Library | null = null;
const listeners = new Set<() => void>();

function read(): Library {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<Library>;
    return {
      lyrics: parsed.lyrics ?? {},
      own: Array.isArray(parsed.own) ? parsed.own : [],
      sets: Array.isArray(parsed.sets) ? parsed.sets : [],
    };
  } catch {
    return EMPTY;
  }
}

function write(next: Library) {
  cache = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Private browsing or a full quota. The session still works, it just forgets.
  }
  for (const listener of listeners) listener();
}

export function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getSnapshot(): Library {
  if (!cache) cache = read();
  return cache;
}

export function getServerSnapshot(): Library {
  return EMPTY;
}

export function setLyrics(slug: string, lyrics: string) {
  const current = getSnapshot();
  const next = { ...current, lyrics: { ...current.lyrics, [slug]: lyrics } };
  if (!lyrics.trim()) delete next.lyrics[slug];
  write(next);
}

export function addSong(song: Song) {
  const current = getSnapshot();
  write({ ...current, own: [...current.own.filter((entry) => entry.slug !== song.slug), song] });
}

export function removeSong(slug: string) {
  const current = getSnapshot();
  const lyrics = { ...current.lyrics };
  delete lyrics[slug];
  write({
    ...current,
    lyrics,
    own: current.own.filter((entry) => entry.slug !== slug),
    // A deleted song must not leave a hole in a set that still lists it.
    sets: current.sets.map((set) => ({ ...set, slugs: set.slugs.filter((entry) => entry !== slug) })),
  });
}

/** The seeded charts and yours, in one list. */
export function allSongs(library: Library): Song[] {
  return [...SEEDED_SONGS, ...library.own];
}

export function findSong(library: Library, slug: string): Song | undefined {
  return allSongs(library).find((song) => song.slug === slug);
}

export function findSet(library: Library, id: string): SetList | undefined {
  return library.sets.find((set) => set.id === id);
}

export function saveSet(set: SetList) {
  const current = getSnapshot();
  const existing = current.sets.some((entry) => entry.id === set.id);
  write({
    ...current,
    sets: existing ? current.sets.map((entry) => (entry.id === set.id ? set : entry)) : [...current.sets, set],
  });
}

export function removeSet(id: string) {
  const current = getSnapshot();
  write({ ...current, sets: current.sets.filter((set) => set.id !== id) });
}

/** Ids only have to be unique in one browser, so counting is enough. */
export function nextSetId(library: Library): string {
  let n = library.sets.length + 1;
  const taken = new Set(library.sets.map((set) => set.id));
  while (taken.has(`set-${n}`)) n++;
  return `set-${n}`;
}

/** Move a song one place up or down the running order. */
export function moveInSet(set: SetList, index: number, delta: number): SetList {
  const target = index + delta;
  if (target < 0 || target >= set.slugs.length) return set;
  const slugs = [...set.slugs];
  [slugs[index], slugs[target]] = [slugs[target], slugs[index]];
  return { ...set, slugs };
}

/** A slug that will not collide with a song already in the library. */
export function slugify(title: string, library: Library): string {
  const base =
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "song";
  const taken = new Set(allSongs(library).map((song) => song.slug));
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}
