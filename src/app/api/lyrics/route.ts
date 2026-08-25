import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Lyrics, from LRCLIB.
 *
 * Genius is the better search — it knows misspellings and half-remembered
 * titles — but it does not serve lyrics, because it licenses them rather than
 * owning them. LRCLIB is an open community database that does serve them, with
 * no key and no auth. So one finds the song and the other fetches the words.
 *
 * Candidates come back with their lyrics attached. They are only a couple of
 * kilobytes each, and it means picking the right take is instant rather than a
 * second round trip. Which matters, because "(instrumental)" and "(live)"
 * versions sit alongside the album take and only you can tell which you want.
 */
export type LyricHit = {
  id: number;
  track: string;
  artist: string;
  album: string | null;
  duration: number | null;
  instrumental: boolean;
  words: number;
  lyrics: string;
};

const MAX = 6;

/** Same words, different album tag, is not a choice worth making. */
function fingerprint(lyrics: string): string {
  return lyrics.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

/**
 * Keep one entry per distinct set of words. A named album beats a compilation
 * or an "(instrumental)" tag, so the one we keep is the one you would recognise.
 */
function distinct(hits: LyricHit[]): LyricHit[] {
  const best = new Map<string, LyricHit>();
  for (const hit of hits) {
    const key = fingerprint(hit.lyrics);
    const held = best.get(key);
    if (!held || score(hit) > score(held)) best.set(key, hit);
  }
  return [...best.values()];
}

function score(hit: LyricHit): number {
  const album = (hit.album ?? "").toLowerCase();
  if (hit.instrumental) return 0;
  if (!album) return 1;
  if (/instrumental|karaoke|tribute|cover/.test(album)) return 1;
  if (/top \d|hits|compilation|best of/.test(album)) return 2;
  return 3;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const track = (searchParams.get("track") ?? "").trim();
  const artist = (searchParams.get("artist") ?? "").trim();
  if (track.length < 2) return NextResponse.json({ hits: [] });

  const query = new URLSearchParams({ track_name: track });
  if (artist) query.set("artist_name", artist);

  try {
    const response = await fetch(`https://lrclib.net/api/search?${query}`, {
      headers: { "User-Agent": "Position (guitar practice app; https://guitar.robens.au)" },
      next: { revalidate: 3600 },
    });
    if (!response.ok) return NextResponse.json({ hits: [], problem: "Lyrics search is not answering." });

    const body = (await response.json()) as unknown;
    const rows = Array.isArray(body) ? body : [];
    const hits: LyricHit[] = rows
      .map((row) => row as Record<string, unknown>)
      .filter((row) => typeof row.plainLyrics === "string" && row.plainLyrics.trim().length > 0)
      .map((row) => {
        const lyrics = (row.plainLyrics as string).trim();
        return {
          id: Number(row.id),
          track: String(row.trackName ?? track),
          artist: String(row.artistName ?? artist),
          album: row.albumName ? String(row.albumName) : null,
          duration: typeof row.duration === "number" ? Math.round(row.duration) : null,
          instrumental: row.instrumental === true,
          words: lyrics.split(/\s+/).length,
          lyrics,
        };
      });

    return NextResponse.json({ hits: distinct(hits).slice(0, MAX) });
  } catch {
    return NextResponse.json({ hits: [], problem: "Could not reach the lyrics database." });
  }
}
