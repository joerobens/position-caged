"use client";

import { useState, type ReactNode } from "react";
import { CaretRight } from "@phosphor-icons/react";
import type { LyricHit } from "@/app/api/lyrics/route";

/**
 * Fetches the words for a song you already have.
 *
 * One distinct set of words means no decision to make, so it just fills the
 * box. The picker only appears when the takes genuinely differ, which happens
 * with live versions and edits. Whatever lands is still yours to edit.
 */
export default function LyricsFinder({
  track,
  artist,
  onPick,
  children,
}: {
  track: string;
  artist: string;
  onPick: (lyrics: string) => void;
  children?: ReactNode;
}) {
  const [looking, setLooking] = useState(false);
  const [hits, setHits] = useState<LyricHit[] | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  const look = async () => {
    if (!ready) return;
    setLooking(true);
    setProblem(null);
    setHits(null);
    try {
      const response = await fetch(`/api/lyrics?${new URLSearchParams({ track, artist })}`);
      const body = (await response.json()) as { hits?: LyricHit[]; problem?: string };
      const found = body.hits ?? [];
      if (body.problem) setProblem(body.problem);
      // Nothing to choose between, so do not make them choose.
      if (found.length === 1) onPick(found[0].lyrics);
      else setHits(found);
    } catch {
      setProblem("Could not reach the lyrics database.");
      setHits([]);
    } finally {
      setLooking(false);
    }
  };

  const empty = hits && hits.length === 0 && !problem;
  // Nothing to search on yet, so do not offer a search that cannot work.
  const ready = track.trim().length >= 2;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="chip whitespace-nowrap"
          data-on={looking || !ready ? undefined : "true"}
          onClick={look}
          disabled={looking || !ready}
          title={ready ? undefined : "Give the song a title first"}
        >
          {looking ? "Looking…" : "Find the words"}
        </button>
        {children}
      </div>

      {problem ? <p className="text-[13px] text-bone-dim">{problem}</p> : null}

      {empty ? (
        <p className="max-w-[58ch] text-[13px] leading-relaxed text-bone-dim">
          Nothing found for <b className="font-medium text-bone">{track}</b>
          {artist ? (
            <>
              {" "}by <b className="font-medium text-bone">{artist}</b>
            </>
          ) : null}
          . The database is community-run, so quieter and older songs are often missing. Paste them in instead.
        </p>
      ) : null}

      {hits && hits.length > 1 ? (
        <div className="max-w-[520px]">
          <p className="text-[13px] leading-relaxed text-bone-dim">
            {hits.length} versions differ. Pick the one you are learning.
          </p>
          <ul className="mt-1">
            {hits.map((hit) => (
              <li key={hit.id} className="border-b border-line last:border-b-0">
                <button
                  type="button"
                  onClick={() => {
                    onPick(hit.lyrics);
                    setHits(null);
                  }}
                  className="flex min-h-11 w-full items-center gap-4 rounded-[8px] py-3 text-left transition-opacity hover:opacity-70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bone active:scale-[0.99]"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] text-bone">{hit.album ?? hit.track}</span>
                    <span className="block truncate text-[12px] text-bone-dim">{hit.artist}</span>
                  </span>
                  <span className="flex-none font-mono text-[11px] text-bone-dim">{hit.words} words</span>
                  <CaretRight size={15} weight="bold" className="flex-none text-bone-dim" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
