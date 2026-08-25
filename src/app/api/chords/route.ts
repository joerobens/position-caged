import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { search, chartFor } from "@/lib/songsterr";
import { toSong } from "@/lib/chartFromChords";

export const runtime = "nodejs";

/**
 * A chord chart for a song you name.
 *
 * Signed in only. The chart comes from Songsterr's own delivery path rather
 * than a documented API, so this stays a thing you do for songs you are
 * learning rather than something the public site does for anyone who passes.
 * It also fails quietly by design: no chart means you type one, which is what
 * the form does anyway.
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

async function signedIn(request: Request): Promise<boolean> {
  if (!url || !key) return false;
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return false;
  try {
    const supabase = createClient(url, key, { auth: { persistSession: false } });
    const { data, error } = await supabase.auth.getUser(token);
    return Boolean(data?.user) && !error;
  } catch {
    return false;
  }
}

/** How well a Songsterr record answers what was asked for. */
function fit(hit: { title: string; artist: string }, track: string, artist: string): number {
  const flat = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  let points = 0;
  if (flat(hit.title) === flat(track)) points += 4;
  else if (flat(hit.title).startsWith(flat(track))) points += 2;
  if (artist && flat(hit.artist) === flat(artist)) points += 3;
  else if (artist && flat(hit.artist).includes(flat(artist).split(" ")[0])) points += 1;
  // A live or acoustic take is a different arrangement of the same song.
  if (/\b(live|acoustic|remix|demo|karaoke)\b/.test(hit.title.toLowerCase())) points -= 3;
  return points;
}

export async function GET(request: Request) {
  if (!(await signedIn(request))) {
    return NextResponse.json({ chart: null, reason: "sign-in" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const track = (searchParams.get("track") ?? "").trim();
  const artist = (searchParams.get("artist") ?? "").trim();
  if (track.length < 2) return NextResponse.json({ chart: null });

  try {
    const hits = await search([track, artist].filter(Boolean).join(" "), 8);
    if (!hits.length) return NextResponse.json({ chart: null, reason: "not-found" });

    const best = [...hits].sort((a, b) => fit(b, track, artist) - fit(a, track, artist))[0];
    const chart = await chartFor(best.songId);
    if (!chart) return NextResponse.json({ chart: null, reason: "no-chords" });

    const song = toSong(chart.bars, chart.capo);
    if (!song) return NextResponse.json({ chart: null, reason: "no-chords" });

    return NextResponse.json({
      chart: song,
      source: { title: best.title, artist: best.artist, songId: best.songId },
      // MIDI notes, high string first, as the tab stores them.
      tuning: chart.tuning,
      instrument: chart.instrument,
    });
  } catch (error) {
    return NextResponse.json({
      chart: null,
      reason: "failed",
      detail: error instanceof Error ? error.message : "Lookup failed.",
    });
  }
}
