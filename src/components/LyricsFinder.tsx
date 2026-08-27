"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { CaretRight } from "@phosphor-icons/react";
import type { LyricHit } from "@/app/api/lyrics/route";
import { ICON } from "@/lib/icons";

/**
 * Fetches the words for a song you already have.
 *
 * You picked the song once already, so this does not ask again. It takes the
 * best match, says which one it took, and offers the others only if you want
 * them. A search for one title turns up the album cut plus every live and
 * acoustic version, and those are different words, so the choice exists. It
 * just is not a question worth asking twice.
 */
export default function LyricsFinder({
  track,
  artist,
  onPick,
  children,
  auto,
  replacing = false,
}: {
  track: string;
  artist: string;
  onPick: (lyrics: string) => void;
  children?: ReactNode;
  /** Changes when a song is chosen upstream, which runs the lookup for you. */
  auto?: string;
  /** True when there are already words, so picking one replaces them. */
  replacing?: boolean;
}) {
  const [looking, setLooking] = useState(false);
  const [hits, setHits] = useState<LyricHit[] | null>(null);
  const [chosen, setChosen] = useState<LyricHit | null>(null);
  const [browsing, setBrowsing] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const look = async () => {
    if (!ready) return;
    setLooking(true);
    setProblem(null);
    setHits(null);
    setChosen(null);
    setBrowsing(false);
    try {
      const response = await fetch(`/api/lyrics?${new URLSearchParams({ track, artist })}`);
      const body = (await response.json()) as { hits?: LyricHit[]; problem?: string };
      const found = body.hits ?? [];
      if (body.problem) setProblem(body.problem);
      setHits(found);
      // Best match first, from the server. Take it rather than asking again.
      if (found.length > 0) {
        setChosen(found[0]);
        onPick(found[0].lyrics);
      }
    } catch {
      setProblem("Could not reach the lyrics database.");
      setHits([]);
    } finally {
      setLooking(false);
    }
  };

  const ran = useRef<string | null>(null);
  useEffect(() => {
    if (!auto || ran.current === auto) return;
    ran.current = auto;
    void look();
    // look is stable enough for this: it reads track/artist, which move with auto.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto]);

  const empty = hits && hits.length === 0 && !problem;
  const others = hits ? hits.filter((hit) => hit.id !== chosen?.id) : [];
  const take = (hit: LyricHit) => {
    setChosen(hit);
    onPick(hit.lyrics);
    setBrowsing(false);
  };
  // Nothing to search on yet, so do not offer a search that cannot work.
  const ready = track.trim().length >= 2;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="btn whitespace-nowrap"
          data-on={looking || !ready || chosen ? undefined : "true"}
          onClick={look}
          disabled={looking || !ready}
          title={ready ? undefined : "Give the song a title first"}
        >
          {looking ? "Looking…" : chosen ? "Look again" : replacing ? "Fetch different words" : "Find the words"}
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

      {chosen ? (
        <p className="flex flex-wrap items-baseline gap-x-2 text-[13px] leading-relaxed text-bone-dim">
          <span>
            Took <b className="font-medium text-bone">{chosen.album ?? chosen.track}</b>, {chosen.words} words.
          </span>
          {others.length ? (
            <button
              type="button"
              className="underline underline-offset-2 hover:text-bone"
              aria-expanded={browsing}
              onClick={() => setBrowsing(!browsing)}
            >
              {browsing ? "never mind" : `${others.length} other version${others.length > 1 ? "s" : ""}`}
            </button>
          ) : null}
        </p>
      ) : null}

      {browsing && others.length ? (
        <div className="max-w-[520px]">
          <ul>
            {others.map((hit) => (
              <li key={hit.id} className="border-b border-line last:border-b-0">
                <button
                  type="button"
                  onClick={() => take(hit)}
                  className="flex min-h-11 w-full items-center gap-4 rounded-[8px] py-3 text-left transition-opacity hover:opacity-70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bone active:scale-[0.99]"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] text-bone">{hit.album ?? hit.track}</span>
                    <span className="block truncate text-[12px] text-bone-dim">{hit.artist}</span>
                  </span>
                  <span className="flex-none font-mono text-[11px] text-bone-dim">{hit.words} words</span>
                  <CaretRight size={ICON.sm} weight="bold" className="flex-none text-bone-dim" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
