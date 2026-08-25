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

const OFF_STUDIO = /\b(live|acoustic|remix|demo|karaoke|instrumental|tribute|cover|session|unplugged)\b/;
const NOT_AN_ALBUM = /\btop \d|\bhits\b|compilation|best of|greatest/;

function plain(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

/**
 * How likely this is the take you meant.
 *
 * Searching a song by name turns up the album cut alongside every live and
 * acoustic version of it, and those are different words: a live take carries
 * the banter. So a title that matches exactly wins, anything announcing itself
 * as another version loses, and a real album beats a compilation.
 */
function score(hit: LyricHit, wanted: string): number {
  let points = 0;
  const title = plain(hit.track);
  const album = (hit.album ?? "").toLowerCase();

  if (title === plain(wanted)) points += 4;
  else if (title.startsWith(plain(wanted))) points += 1;

  if (OFF_STUDIO.test(hit.track.toLowerCase())) points -= 3;
  if (OFF_STUDIO.test(album)) points -= 2;
  if (NOT_AN_ALBUM.test(album)) points -= 1;
  if (hit.instrumental) points -= 5;
  if (album) points += 1;

  return points;
}

/**
 * Keep one entry per distinct set of words, best first, so the caller can take
 * the first and be right most of the time.
 */
function distinct(hits: LyricHit[], wanted: string): LyricHit[] {
  const best = new Map<string, LyricHit>();
  for (const hit of hits) {
    const key = fingerprint(hit.lyrics);
    const held = best.get(key);
    if (!held || score(hit, wanted) > score(held, wanted)) best.set(key, hit);
  }
  return [...best.values()].sort((a, b) => score(b, wanted) - score(a, wanted));
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
          // Some rows carry the literal string "null" as an album name.
          album: /^(null|unknown|)$/i.test(String(row.albumName ?? "").trim())
            ? null
            : String(row.albumName),
          duration: typeof row.duration === "number" ? Math.round(row.duration) : null,
          instrumental: row.instrumental === true,
          words: lyrics.split(/\s+/).length,
          lyrics,
        };
      });

    return NextResponse.json({ hits: distinct(hits, track).slice(0, MAX) });
  } catch {
    return NextResponse.json({ hits: [], problem: "Could not reach the lyrics database." });
  }
}
