import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

/**
 * The database is optional. Without these set the app runs exactly as it did
 * before, on browser storage alone, which is also what happens when there is no
 * signal on a stand somewhere.
 */
export const syncConfigured = Boolean(url && key);

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!syncConfigured) return null;
  if (!client) {
    client = createClient(url!, key!, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    });
  }
  return client;
}

/**
 * What comes back from a read. The database sets updated_at, so it is always
 * present here and never sent on a write: the two shapes are kept apart so a
 * push cannot accidentally claim to know when something changed.
 */
export type RemoteSong = {
  user_id: string;
  slug: string;
  title: string;
  credit: string;
  root: number;
  tonality: "major" | "minor";
  numbering: "relative-major" | "tonic" | null;
  capo: number | null;
  tuning: string | null;
  source_url: string | null;
  art: string | null;
  feel: string | null;
  bpm: number | null;
  chart: { name: string; bars: string[] }[];
  note: string | null;
  updated_at: string;
};

export type RemoteLyric = { user_id: string; slug: string; body: string; updated_at: string };

export type RemoteSet = {
  user_id: string;
  id: string;
  name: string;
  slugs: string[];
  note: string | null;
  updated_at: string;
};

/** What a push sends. */
export type SongInsert = Omit<RemoteSong, "updated_at">;
export type LyricInsert = Omit<RemoteLyric, "updated_at">;
export type SetInsert = Omit<RemoteSet, "updated_at">;
