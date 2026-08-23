import { SEEDED_SONGS, type Song } from "./songs";

/**
 * Your half of the library. Lyrics you paste and songs you add live here, in the
 * browser, and are never committed: the repo is public, and words are somebody's
 * property in a way a chord progression is not.
 */
export type Library = {
  /** Lyrics keyed by song slug. */
  lyrics: Record<string, string>;
  /** Songs you added yourself. */
  own: Song[];
};

const KEY = "position:songs:v1";
const EMPTY: Library = { lyrics: {}, own: [] };

let cache: Library | null = null;
const listeners = new Set<() => void>();

function read(): Library {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<Library>;
    return { lyrics: parsed.lyrics ?? {}, own: Array.isArray(parsed.own) ? parsed.own : [] };
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
  write({ lyrics, own: current.own.filter((entry) => entry.slug !== slug) });
}

/** The seeded charts and yours, in one list. */
export function allSongs(library: Library): Song[] {
  return [...SEEDED_SONGS, ...library.own];
}

export function findSong(library: Library, slug: string): Song | undefined {
  return allSongs(library).find((song) => song.slug === slug);
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
