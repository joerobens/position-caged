"use client";

import { useState } from "react";
import { getSupabase } from "@/lib/supabase";

type Found = { artist: string; song: string; section: string; url: string };

/**
 * What else is built on the same chords.
 *
 * Asked rather than fetched on sight, because it is a curiosity rather than
 * something the page needs, and because the account behind it has ten requests
 * every ten seconds to spend.
 */
export default function SongsOnThis({ bars }: { bars: string[] }) {
  const [state, setState] = useState<"idle" | "looking" | "gated" | "none" | "off" | "failed">("idle");
  const [found, setFound] = useState<Found[] | null>(null);
  const [path, setPath] = useState<string | null>(null);

  const look = async () => {
    setState("looking");
    setFound(null);
    try {
      const session = (await getSupabase()?.auth.getSession())?.data.session;
      if (!session) {
        setState("gated");
        return;
      }
      const query = new URLSearchParams({ bars: bars.join(" ") });
      const response = await fetch(`/api/progression?${query}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (response.status === 401) {
        setState("gated");
        return;
      }
      const body = (await response.json()) as {
        configured: boolean;
        songs: Found[];
        path?: string;
        reason?: string;
      };
      if (!body.configured) {
        setState("off");
        return;
      }
      if (!body.songs.length) {
        setPath(body.path ?? null);
        setState(body.reason === "not-askable" ? "none" : "failed");
        return;
      }
      setPath(body.path ?? null);
      setFound(body.songs);
      setState("idle");
    } catch {
      setState("failed");
    }
  };

  return (
    <div className="mt-4 flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className="btn" disabled={state === "looking"} onClick={look}>
          {state === "looking" ? "Looking…" : "What else uses these chords?"}
        </button>
        {path && found ? (
          <span className="font-mono text-[13px] text-bone-dim">
            {path.split(",").join(" → ")} · {found.length} found
          </span>
        ) : null}
        {state === "gated" ? <span className="text-[13px] text-bone-dim">Sign in to look this up.</span> : null}
        {state === "off" ? (
          <span className="text-[13px] text-bone-dim">Not set up on this deployment.</span>
        ) : null}
        {state === "none" ? (
          <span className="max-w-[54ch] text-[13px] leading-relaxed text-bone-dim">
            This one cannot be asked about: the index only covers the seven plain degrees, and this chart steps
            outside them.
          </span>
        ) : null}
        {state === "failed" ? <span className="text-[13px] text-bone-dim">Could not reach it.</span> : null}
      </div>

      {found?.length ? (
        <ul className="max-w-[560px]">
          {found.slice(0, 12).map((song, index) => (
            <li key={`${song.url}-${index}`} className="border-b border-line last:border-b-0">
              <a
                href={song.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-h-11 items-center gap-3 py-2.5 transition-opacity hover:opacity-70"
              >
                <span className="min-w-0 flex-1 truncate text-[14px] text-bone">{song.song}</span>
                <span className="min-w-0 flex-1 truncate text-[13px] text-bone-dim">{song.artist}</span>
                {song.section ? (
                  <span className="flex-none font-mono text-[11px] text-bone-dim">{song.section}</span>
                ) : null}
              </a>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
