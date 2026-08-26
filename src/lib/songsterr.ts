/**
 * Chord charts, from Songsterr.
 *
 * Five sources were tried for song-to-chords and this is the only one that
 * carries them. Its search is a plain public endpoint; the chart itself sits on
 * a CDN behind a token that only appears in the page HTML, so the chain is
 * search, then resolve, then fetch. That middle step is their own delivery path
 * rather than a documented API, so everything here fails softly: no chart just
 * means you type it in, which is what you were doing anyway.
 */

const UA = "Position (personal guitar practice tool; https://guitar.robens.au)";
import { chordsFromNotes, settle } from "./chordsFromNotes";

const CDN = "https://dqsljvtekg760.cloudfront.net";

export type SongsterrHit = {
  songId: number;
  artist: string;
  title: string;
  hasChords: boolean;
  /** Pitch classes low string to high, when the tab says. */
  tuning: number[] | null;
  difficulty: number | null;
};

export type Chart = {
  /** One entry per bar. A bar can hold more than one chord. */
  bars: string[][];
  capo: number;
  /** MIDI notes, high string first, as the tab stores them. */
  tuning: number[] | null;
  instrument: string;
  /** True when nobody wrote the chords down and they were read off the notes. */
  derived: boolean;
};

type Beat = { chord?: { text?: string } };
type Measure = { voices?: { beats?: Beat[] }[] };
type Track = {
  measures?: Measure[];
  capo?: number;
  tuning?: number[];
  instrument?: string;
  instrumentId?: number;
};

async function get(url: string, as: "json" | "text") {
  const response = await fetch(url, {
    headers: { "User-Agent": UA, Accept: as === "json" ? "application/json" : "text/html" },
    // One song's chart does not change, so it is worth holding on to.
    next: { revalidate: 60 * 60 * 24 },
  });
  if (!response.ok) throw new Error(`${response.status} from ${new URL(url).host}`);
  return as === "json" ? response.json() : response.text();
}

/** Songs matching a title, best first, as Songsterr ranks them. */
export async function search(pattern: string, size = 8): Promise<SongsterrHit[]> {
  const query = new URLSearchParams({ pattern, size: String(size), from: "0", more: "true" });
  const body = (await get(`https://www.songsterr.com/api/search?${query}`, "json")) as {
    records?: unknown[];
  };
  const rows = Array.isArray(body?.records) ? body.records : [];
  return rows
    .map((row) => row as Record<string, unknown>)
    .filter((row) => row.isJunk !== true)
    .map((row) => {
      const tracks = Array.isArray(row.tracks) ? (row.tracks as Record<string, unknown>[]) : [];
      const guitar = tracks.find((track) => /guitar/i.test(String(track.instrument ?? ""))) ?? tracks[0];
      const tuning = Array.isArray(guitar?.tuning) ? (guitar.tuning as number[]) : null;
      return {
        songId: Number(row.songId),
        artist: String(row.artist ?? ""),
        title: String(row.title ?? ""),
        hasChords: row.hasChords === true,
        tuning,
        difficulty: typeof guitar?.difficulty === "number" ? guitar.difficulty : null,
      };
    })
    .filter((hit) => Number.isFinite(hit.songId));
}

/** The token and revision that address a song's data, both of which live in its page. */
async function resolve(songId: number): Promise<{ revision: string; token: string }> {
  const html = (await get(`https://www.songsterr.com/a/wa/song?id=${songId}`, "text")) as string;
  const token = /v\d+-\d+-\d+-[A-Za-z0-9_-]+/.exec(html)?.[0];
  const revision = [...html.matchAll(/"revisionId":(\d+)/g)].map((m) => m[1]).find((id) => id !== "0");
  if (!token || !revision) throw new Error("Songsterr changed the shape of its page.");
  return { revision, token };
}

/**
 * The chart for a song.
 *
 * A song has several tracks and only some carry chord names, so this walks them
 * until it finds one that does, preferring guitar over bass and drums.
 */
export async function chartFor(songId: number, tracks = 14): Promise<Chart | null> {
  const { revision, token } = await resolve(songId);
  const guitars: Track[] = [];

  for (let index = 0; index < tracks; index++) {
    let track: Track;
    try {
      track = (await get(`${CDN}/${songId}/${revision}/${token}/${index}.json`, "json")) as Track;
    } catch {
      break; // ran off the end of the track list
    }
    if (/bass|drum|percussion/i.test(track.instrument ?? "")) continue;
    guitars.push(track);

    const bars = (track.measures ?? []).map((measure) => {
      const found: string[] = [];
      for (const voice of measure.voices ?? []) {
        for (const beat of voice.beats ?? []) {
          const text = beat.chord?.text?.trim();
          if (text && found[found.length - 1] !== text) found.push(text);
        }
      }
      return found;
    });

    if (bars.some((bar) => bar.length)) return asChart(track, bars, false);
  }

  // Nobody wrote them down. Read them off the notes instead, from whichever
  // guitar part carries the most of the song.
  const richest = guitars
    .filter((track) => Array.isArray(track.tuning) && (track.measures?.length ?? 0) > 0)
    .sort((a, b) => (b.measures?.length ?? 0) - (a.measures?.length ?? 0))[0];
  if (!richest) return null;

  const read = settle(chordsFromNotes(richest.measures ?? [], richest.tuning as number[]));
  return read.some((bar) => bar.length) ? asChart(richest, read, true) : null;
}

function asChart(track: Track, bars: string[][], derived: boolean): Chart {
  return {
    bars,
    capo: typeof track.capo === "number" ? track.capo : 0,
    tuning: Array.isArray(track.tuning) ? track.tuning : null,
    instrument: track.instrument ?? "",
    derived,
  };
}
