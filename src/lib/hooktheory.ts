/**
 * Songs built on a progression.
 *
 * Hooktheory's API runs one way only: you give it a sequence of degrees and it
 * tells you which songs use it. That is useless for looking a song up, which
 * is what it was first tried for here, but it is exactly right for the other
 * question: you have written four chords, so what else is made of them?
 *
 * Their "cp" is scale degrees separated by commas, counted in the major key,
 * so vi is 6 and the quality is implied. That happens to be how the charts
 * here are already numbered, minor songs included, so the two agree without
 * any translation beyond dropping the quality mark.
 */

const BASE = "https://api.hooktheory.com/v1";

export type SongOnProgression = {
  artist: string;
  song: string;
  section: string;
  url: string;
};

/**
 * Chart tokens as a child path, or null when the progression cannot be asked
 * about: anything with an accidental in it is outside the seven degrees their
 * index is built on.
 */
export function childPath(tokens: string[]): string | null {
  const degrees: string[] = [];
  for (const token of tokens) {
    const trimmed = token.trim();
    if (!trimmed || trimmed === "%") continue; // a hold is not a change
    const match = /^([b#]?)([1-7])/.exec(trimmed);
    if (!match) return null;
    if (match[1]) return null; // borrowed or altered, and not in their index
    const degree = match[2];
    // Repeating the same chord is one step of the path, not two.
    if (degrees[degrees.length - 1] !== degree) degrees.push(degree);
  }
  // One chord is not a progression, and past four the index thins out to nothing.
  if (degrees.length < 2) return null;
  return degrees.slice(0, 4).join(",");
}

/** The token their API wants, exchanged once for a username and password. */
export function configured(): boolean {
  return Boolean(process.env.HOOKTHEORY_TOKEN);
}

export async function songsOn(path: string): Promise<SongOnProgression[]> {
  const token = process.env.HOOKTHEORY_TOKEN;
  if (!token) return [];
  const response = await fetch(`${BASE}/trends/songs?cp=${encodeURIComponent(path)}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    // They allow ten requests every ten seconds, and a progression's songs do
    // not change, so this is cached hard.
    next: { revalidate: 60 * 60 * 24 * 7 },
  });
  if (!response.ok) throw new Error(`Hooktheory said ${response.status}`);
  const body = (await response.json()) as unknown;
  if (!Array.isArray(body)) return [];
  return body
    .map((row) => row as Record<string, unknown>)
    .filter((row) => row.song && row.artist)
    .map((row) => ({
      artist: String(row.artist),
      song: String(row.song),
      section: String(row.section ?? ""),
      // Their sample data carries a local hostname, which would be a dead link.
      url: String(row.url ?? "").replace("http://local.www.hooktheory.com", "https://www.hooktheory.com"),
    }));
}
