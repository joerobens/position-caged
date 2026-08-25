import { NextResponse } from "next/server";

/**
 * Song lookup, and only lookup.
 *
 * This returns titles, artists, artwork and the address of the Genius page. It
 * deliberately does not return words, because the Genius API does not serve them
 * and the libraries that claim to are scraping the page, which is outside their
 * terms. The words stay something you paste in yourself, where they belong.
 *
 * The token is read here rather than in the browser: it is an account credential,
 * not a publishable key like the Supabase one.
 */
export const runtime = "nodejs";

export type GeniusHit = {
  id: number;
  title: string;
  artist: string;
  url: string;
  art: string | null;
  year: string | null;
};

type GeniusResponse = {
  response?: {
    hits?: {
      result?: {
        id: number;
        title: string;
        primary_artist?: { name?: string };
        url: string;
        song_art_image_thumbnail_url?: string;
        release_date_for_display?: string;
      };
    }[];
  };
};

export async function GET(request: Request) {
  const token = process.env.GENIUS_ACCESS_TOKEN;
  if (!token) {
    return NextResponse.json({ configured: false, hits: [] as GeniusHit[] });
  }

  const query = new URL(request.url).searchParams.get("q")?.trim();
  if (!query) return NextResponse.json({ configured: true, hits: [] as GeniusHit[] });

  try {
    const response = await fetch(`https://api.genius.com/search?q=${encodeURIComponent(query)}`, {
      headers: { Authorization: `Bearer ${token}` },
      // Searches repeat a lot while typing, and the catalogue does not move.
      next: { revalidate: 3600 },
    });
    if (!response.ok) {
      return NextResponse.json(
        { configured: true, hits: [], error: `Genius said ${response.status}` },
        { status: 502 },
      );
    }
    const body = (await response.json()) as GeniusResponse;
    const hits: GeniusHit[] = (body.response?.hits ?? [])
      .map((hit) => hit.result)
      .filter((result): result is NonNullable<typeof result> => Boolean(result))
      .map((result) => ({
        id: result.id,
        title: result.title,
        artist: result.primary_artist?.name ?? "",
        url: result.url,
        art: result.song_art_image_thumbnail_url ?? null,
        year: result.release_date_for_display ?? null,
      }));
    return NextResponse.json({ configured: true, hits });
  } catch (error) {
    return NextResponse.json(
      { configured: true, hits: [], error: error instanceof Error ? error.message : "Lookup failed." },
      { status: 502 },
    );
  }
}
