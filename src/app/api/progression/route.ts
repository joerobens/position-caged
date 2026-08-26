import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { childPath, configured, songsOn } from "@/lib/hooktheory";

export const runtime = "nodejs";

/**
 * What else is built on this progression.
 *
 * Signed in only, for the same reason the chord lookup is: the token belongs
 * to one Hooktheory account with ten requests every ten seconds, and a public
 * route would spend that on strangers.
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

export async function GET(request: Request) {
  if (!configured()) return NextResponse.json({ configured: false, songs: [] });
  if (!(await signedIn(request))) {
    return NextResponse.json({ configured: true, songs: [], reason: "sign-in" }, { status: 401 });
  }

  const tokens = (new URL(request.url).searchParams.get("bars") ?? "").split(" ").filter(Boolean);
  const path = childPath(tokens);
  if (!path) return NextResponse.json({ configured: true, songs: [], reason: "not-askable" });

  try {
    const songs = await songsOn(path);
    return NextResponse.json({ configured: true, path, songs });
  } catch (error) {
    return NextResponse.json({
      configured: true,
      songs: [],
      reason: "failed",
      detail: error instanceof Error ? error.message : "Lookup failed.",
    });
  }
}
