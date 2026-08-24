import { claimLibrary, getSnapshot, markSynced, mergeFromRemote, type Library } from "./songStore";
import { getSupabase, type RemoteLyric, type RemoteSet, type RemoteSong } from "./supabase";
import type { Song } from "./songs";

/**
 * Sync, not storage.
 *
 * The browser stays the read path: everything on screen comes from localStorage,
 * so the stand works on a dead connection. This pulls what is newer from the
 * database, pushes what is newer here, and stays out of the way otherwise.
 *
 * Conflicts resolve last write wins per row, which is the right answer for one
 * person on two devices and the wrong answer for a band sharing a library. If
 * this ever grows past one person that needs revisiting.
 */
export type SyncResult = { pulled: number; pushed: number; at: number; claim: "adopted" | "resumed" | "switched" };

const isNewer = (local: number | undefined, remote: string) => (local ?? 0) > Date.parse(remote);

export async function syncLibrary(userId: string): Promise<SyncResult> {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Sync is not configured.");

  // Settle whose library this is before a single row moves in either direction.
  const claim = claimLibrary(userId);
  const local = getSnapshot();
  const [songs, lyrics, sets] = await Promise.all([
    supabase.from("guitar_songs").select("*").eq("user_id", userId),
    supabase.from("guitar_lyrics").select("*").eq("user_id", userId),
    supabase.from("guitar_sets").select("*").eq("user_id", userId),
  ]);
  const failure = songs.error ?? lyrics.error ?? sets.error;
  if (failure) throw new Error(failure.message);

  const remoteSongs = (songs.data ?? []) as RemoteSong[];
  const remoteLyrics = (lyrics.data ?? []) as RemoteLyric[];
  const remoteSets = (sets.data ?? []) as RemoteSet[];

  const next: Library = {
    ...local,
    own: [...local.own],
    lyrics: { ...local.lyrics },
    sets: [...local.sets],
    touched: { ...local.touched },
  };
  let pulled = 0;
  const pushSongs: RemoteSong[] = [];
  const pushLyrics: RemoteLyric[] = [];
  const pushSets: RemoteSet[] = [];

  // Anything the database has that is newer than the copy here comes down.
  const wasDeleted = (key: string, at: string) => (local.deleted[key] ?? 0) > Date.parse(at);

  for (const row of remoteSongs) {
    if (wasDeleted(`songs:${row.slug}`, row.updated_at)) continue;
    if (isNewer(local.touched[`songs:${row.slug}`], row.updated_at)) continue;
    const incoming: Song = {
      slug: row.slug,
      title: row.title,
      credit: row.credit,
      root: row.root,
      tonality: row.tonality,
      numbering: row.numbering ?? undefined,
      capo: row.capo ?? undefined,
      feel: row.feel ?? undefined,
      bpm: row.bpm ?? undefined,
      chart: row.chart,
      note: row.note ?? undefined,
    };
    next.own = [...next.own.filter((song) => song.slug !== row.slug), incoming];
    next.touched[`songs:${row.slug}`] = Date.parse(row.updated_at);
    pulled++;
  }
  for (const row of remoteLyrics) {
    if (wasDeleted(`lyrics:${row.slug}`, row.updated_at)) continue;
    if (isNewer(local.touched[`lyrics:${row.slug}`], row.updated_at)) continue;
    next.lyrics[row.slug] = row.body;
    next.touched[`lyrics:${row.slug}`] = Date.parse(row.updated_at);
    pulled++;
  }
  for (const row of remoteSets) {
    if (wasDeleted(`sets:${row.id}`, row.updated_at)) continue;
    if (isNewer(local.touched[`sets:${row.id}`], row.updated_at)) continue;
    next.sets = [
      ...next.sets.filter((set) => set.id !== row.id),
      { id: row.id, name: row.name, slugs: row.slugs, note: row.note ?? undefined },
    ];
    next.touched[`sets:${row.id}`] = Date.parse(row.updated_at);
    pulled++;
  }

  // Anything here that the database has not got, or has an older copy of, goes up.
  const remoteSongAt = new Map(remoteSongs.map((row) => [row.slug, Date.parse(row.updated_at)]));
  const remoteLyricAt = new Map(remoteLyrics.map((row) => [row.slug, Date.parse(row.updated_at)]));
  const remoteSetAt = new Map(remoteSets.map((row) => [row.id, Date.parse(row.updated_at)]));

  for (const song of local.own) {
    const at = local.touched[`songs:${song.slug}`] ?? 0;
    if (at <= (remoteSongAt.get(song.slug) ?? -1)) continue;
    pushSongs.push({
      user_id: userId,
      slug: song.slug,
      title: song.title,
      credit: song.credit,
      root: song.root,
      tonality: song.tonality,
      numbering: song.numbering ?? null,
      capo: song.capo ?? null,
      feel: song.feel ?? null,
      bpm: song.bpm ?? null,
      chart: song.chart,
      note: song.note ?? null,
      updated_at: new Date(at).toISOString(),
    });
  }
  for (const [slug, body] of Object.entries(local.lyrics)) {
    const at = local.touched[`lyrics:${slug}`] ?? 0;
    if (at <= (remoteLyricAt.get(slug) ?? -1)) continue;
    pushLyrics.push({ user_id: userId, slug, body, updated_at: new Date(at).toISOString() });
  }
  for (const set of local.sets) {
    const at = local.touched[`sets:${set.id}`] ?? 0;
    if (at <= (remoteSetAt.get(set.id) ?? -1)) continue;
    pushSets.push({
      user_id: userId,
      id: set.id,
      name: set.name,
      slugs: set.slugs,
      note: set.note ?? null,
      updated_at: new Date(at).toISOString(),
    });
  }

  // Deleting here has to delete there, or the next sync brings it all back.
  const gone = { songs: [] as string[], lyrics: [] as string[], sets: [] as string[] };
  for (const [key, at] of Object.entries(local.deleted)) {
    const [kind, id] = [key.slice(0, key.indexOf(":")), key.slice(key.indexOf(":") + 1)];
    const remoteAt =
      kind === "songs" ? remoteSongAt.get(id) : kind === "lyrics" ? remoteLyricAt.get(id) : remoteSetAt.get(id);
    if (remoteAt === undefined || at <= remoteAt) continue;
    if (kind === "songs") gone.songs.push(id);
    if (kind === "lyrics") gone.lyrics.push(id);
    if (kind === "sets") gone.sets.push(id);
  }
  if (gone.songs.length) {
    const { error } = await supabase.from("guitar_songs").delete().eq("user_id", userId).in("slug", gone.songs);
    if (error) throw new Error(error.message);
  }
  if (gone.lyrics.length) {
    const { error } = await supabase.from("guitar_lyrics").delete().eq("user_id", userId).in("slug", gone.lyrics);
    if (error) throw new Error(error.message);
  }
  if (gone.sets.length) {
    const { error } = await supabase.from("guitar_sets").delete().eq("user_id", userId).in("id", gone.sets);
    if (error) throw new Error(error.message);
  }

  if (pushSongs.length) {
    const { error } = await supabase.from("guitar_songs").upsert(pushSongs, { onConflict: "user_id,slug" });
    if (error) throw new Error(error.message);
  }
  if (pushLyrics.length) {
    const { error } = await supabase.from("guitar_lyrics").upsert(pushLyrics, { onConflict: "user_id,slug" });
    if (error) throw new Error(error.message);
  }
  if (pushSets.length) {
    const { error } = await supabase.from("guitar_sets").upsert(pushSets, { onConflict: "user_id,id" });
    if (error) throw new Error(error.message);
  }

  const at = Date.now();
  if (pulled) mergeFromRemote(next);
  markSynced(at);
  const removed = gone.songs.length + gone.lyrics.length + gone.sets.length;
  return { pulled, pushed: pushSongs.length + pushLyrics.length + pushSets.length + removed, at, claim };
}
