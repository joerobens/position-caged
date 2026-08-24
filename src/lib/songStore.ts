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
  /**
   * Whose library this browser is holding. Null means nobody has signed in yet.
   * Without this, signing out and signing in as someone else would push your
   * songs into their account, which on a shared project is not hypothetical.
   */
  ownerId: string | null;
  /** When this browser last agreed with the database. */
  syncedAt: number;
  /**
   * Deletions, keyed the same way as touched. Without these a delete never
   * reaches the database and the next sync pulls the song straight back down.
   */
  deleted: Record<string, number>;
  /** Seeded songs you would rather not see. They cannot be deleted, only hidden. */
  hidden: string[];
  /** Lyrics keyed by song slug. */
  lyrics: Record<string, string>;
  /** Songs you added yourself. */
  own: Song[];
  /** Sets you have put together. */
  sets: SetList[];
  /**
   * When each row was last changed here, so a sync can tell which side is newer
   * without a server round trip. Keyed "songs:slug", "lyrics:slug", "sets:id".
   */
  touched: Record<string, number>;
};

const KEY = "position:songs:v1";
const EMPTY: Library = { ownerId: null, syncedAt: 0, lyrics: {}, own: [], sets: [], touched: {}, deleted: {}, hidden: [] };

let cache: Library | null = null;
const listeners = new Set<() => void>();

function read(): Library {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<Library>;
    return {
      ownerId: parsed.ownerId ?? null,
      syncedAt: parsed.syncedAt ?? 0,
      deleted: parsed.deleted ?? {},
      hidden: Array.isArray(parsed.hidden) ? parsed.hidden : [],
      lyrics: parsed.lyrics ?? {},
      own: Array.isArray(parsed.own) ? parsed.own : [],
      sets: Array.isArray(parsed.sets) ? parsed.sets : [],
      touched: parsed.touched ?? {},
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
  const next = { ...current, lyrics: { ...current.lyrics, [slug]: lyrics }, touched: stamp(current, `lyrics:${slug}`) };
  if (!lyrics.trim()) delete next.lyrics[slug];
  write(next);
}

function stamp(library: Library, key: string): Record<string, number> {
  return { ...library.touched, [key]: Date.now() };
}

/** Applies rows that came back from the database without restamping them. */
export function mergeFromRemote(next: Library) {
  write(next);
}

export function addSong(song: Song) {
  const current = getSnapshot();
  write({
    ...current,
    own: [...current.own.filter((entry) => entry.slug !== song.slug), song],
    touched: stamp(current, `songs:${song.slug}`),
  });
}

export function removeSong(slug: string) {
  const current = getSnapshot();
  const lyrics = { ...current.lyrics };
  delete lyrics[slug];
  const now = Date.now();
  write({
    ...current,
    lyrics,
    own: current.own.filter((entry) => entry.slug !== slug),
    // A deleted song must not leave a hole in a set that still lists it.
    sets: current.sets.map((set) => ({ ...set, slugs: set.slugs.filter((entry) => entry !== slug) })),
    // Remembered as a deletion so the next sync removes it from the database
    // rather than pulling it back down.
    deleted: { ...current.deleted, [`songs:${slug}`]: now, [`lyrics:${slug}`]: now },
  });
}

/** A seeded chart cannot be deleted, since it is code, but it can be put away. */
export function hideSeeded(slug: string) {
  const current = getSnapshot();
  if (current.hidden.includes(slug)) return;
  write({ ...current, hidden: [...current.hidden, slug] });
}

export function unhideSeeded(slug: string) {
  const current = getSnapshot();
  write({ ...current, hidden: current.hidden.filter((entry) => entry !== slug) });
}

/**
 * Yours first, always. What you added is what you are working on; the seeded
 * charts are a starting point you have already moved past the moment you add
 * anything of your own.
 */
export function allSongs(library: Library): Song[] {
  return [...library.own, ...SEEDED_SONGS.filter((song) => !library.hidden.includes(song.slug))];
}

/** Including the ones put away, for the page that offers them back. */
export function allSongsIncludingHidden(library: Library): Song[] {
  return [...library.own, ...SEEDED_SONGS];
}

export function isSeeded(slug: string): boolean {
  return SEEDED_SONGS.some((song) => song.slug === slug);
}

export function findSong(library: Library, slug: string): Song | undefined {
  return allSongsIncludingHidden(library).find((song) => song.slug === slug);
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
    touched: stamp(current, `sets:${set.id}`),
  });
}

export function removeSet(id: string) {
  const current = getSnapshot();
  write({
    ...current,
    sets: current.sets.filter((set) => set.id !== id),
    deleted: { ...current.deleted, [`sets:${id}`]: Date.now() },
  });
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

/**
 * Work out whose library this is before syncing anything.
 *
 * Three cases. Nobody has signed in here, so the work belongs to whoever just
 * did. The same person is back, so carry on. Or somebody else is signing in on
 * this browser, in which case their account must not inherit the last person's
 * songs: the local copy is dropped and theirs is pulled down instead.
 */
export function claimLibrary(userId: string): "adopted" | "resumed" | "switched" {
  const current = getSnapshot();
  if (current.ownerId === userId) return "resumed";

  if (current.ownerId === null) {
    // Everything here is unsynced by definition, so stamp it all to push up.
    const touched = { ...current.touched };
    const now = Date.now();
    for (const song of current.own) touched[`songs:${song.slug}`] ??= now;
    for (const slug of Object.keys(current.lyrics)) touched[`lyrics:${slug}`] ??= now;
    for (const set of current.sets) touched[`sets:${set.id}`] ??= now;
    write({ ...current, ownerId: userId, syncedAt: 0, touched });
    return "adopted";
  }

  write({ ...EMPTY, ownerId: userId });
  return "switched";
}

/** Back to an empty anonymous library, so the next person starts clean. */
export function releaseLibrary() {
  write({ ...EMPTY });
}

export function markSynced(at: number) {
  write({ ...getSnapshot(), syncedAt: at });
}

/** Rows changed here since the last agreement with the database. */
export function pendingCount(library: Library): number {
  return Object.values(library.touched).filter((at) => at > library.syncedAt).length;
}
