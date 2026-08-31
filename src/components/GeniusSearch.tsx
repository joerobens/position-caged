"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowSquareOut, MagnifyingGlass } from "@phosphor-icons/react";
import type { GeniusHit } from "@/app/api/genius/search/route";
import { ICON } from "@/lib/icons";

/**
 * Look a song up so its title and artist are not typed by hand. Metadata only:
 * the words are still yours to paste, and the link is so you can go and get them.
 */
export default function GeniusSearch({
  onPick,
  caption = "Find the song",
  linked,
}: {
  onPick: (hit: { title: string; artist: string; url: string; art: string | null }) => void;
  caption?: string;
  /**
   * A song that is already linked, so editing one shows what it is linked to
   * rather than an empty box pretending it is not.
   */
  linked?: { title: string; artist: string; url: string; art?: string } | null;
}) {
  const [query, setQuery] = useState("");
  // Results are kept with the term that produced them, so a stale list can be
  // ignored on render rather than cleared from inside an effect.
  const [result, setResult] = useState<{ q: string; hits: GeniusHit[] }>({ q: "", hits: [] });
  const [picked, setPicked] = useState<GeniusHit | null>(
    linked ? { id: -1, title: linked.title, artist: linked.artist, url: linked.url, art: linked.art ?? null, year: null } : null,
  );
  const [filling, setFilling] = useState(false);
  const [state, setState] = useState<"idle" | "searching" | "off" | "failed">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const latest = useRef(0);

  const term = query.trim();
  const tooShort = term.length < 2;
  const hits = result.q === term ? result.hits : [];

  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) return;
    const run = ++latest.current;
    const timer = window.setTimeout(async () => {
      setState("searching");
      try {
        const response = await fetch(`/api/genius/search?q=${encodeURIComponent(term)}`);
        const body = (await response.json()) as { configured: boolean; hits: GeniusHit[]; error?: string };
        if (run !== latest.current) return;
        if (!body.configured) {
          setState("off");
          return;
        }
        if (body.error) {
          setState("failed");
          setMessage(body.error);
          return;
        }
        setResult({ q: term, hits: body.hits.slice(0, 6) });
        setState("idle");
      } catch (error) {
        if (run !== latest.current) return;
        setState("failed");
        setMessage(error instanceof Error ? error.message : "Lookup failed.");
      }
    }, 350);
    return () => window.clearTimeout(timer);
  }, [query]);

  return (
    <div className="panel flex flex-col gap-3">
      <label className="flex flex-col gap-2">
        <span className="label">{caption}</span>
        <span className="flex items-center gap-2.5 rounded-[10px] border border-line bg-ink px-3">
          <MagnifyingGlass size={ICON.md} weight="bold" className="flex-none text-bone-dim" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="title, or title and artist"
            aria-label="Search for a song"
            className="min-h-11 w-full bg-transparent text-sm text-bone outline-none placeholder:text-bone-dim"
          />
        </span>
      </label>

      {state === "off" ? (
        <p className="text-[13px] leading-relaxed text-bone-dim">
          Lookup is not set up on this deployment. Add a <b className="font-medium text-bone">GENIUS_ACCESS_TOKEN</b>{" "}
          and it appears. Typing a song in by hand works either way.
        </p>
      ) : state === "failed" ? (
        <p role="alert" className="text-[13px] leading-relaxed text-bone-dim">
          {message} Type it in by hand instead.
        </p>
      ) : state === "searching" && !hits.length ? (
        <p className="text-[13px] text-bone-dim">Looking&hellip;</p>
      ) : picked ? (
        <div className="flex items-center gap-3 rounded-xl border border-line bg-ink px-3 py-2.5">
          {picked.art ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={picked.art} alt="" className="size-10 flex-none rounded-md object-cover" />
          ) : null}
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-bone">{picked.title}</span>
            <span className="block truncate text-[12.5px] text-bone-dim">{picked.artist}</span>
          </span>
          {/* Linked before artwork was kept, so it can be fetched now. */}
          {!picked.art ? (
            <button
              type="button"
              className="btn flex-none"
              disabled={filling}
              onClick={async () => {
                setFilling(true);
                try {
                  const query = new URLSearchParams({ q: `${picked.title} ${picked.artist}` });
                  const response = await fetch(`/api/genius/search?${query}`);
                  const body = (await response.json()) as { hits?: GeniusHit[] };
                  // The same song, by its own link, rather than whatever ranks first.
                  const same = body.hits?.find((hit) => hit.url === picked.url) ?? body.hits?.[0];
                  if (same) {
                    setPicked(same);
                    onPick({ title: same.title, artist: same.artist, url: same.url, art: same.art });
                  }
                } catch {
                  // Nothing to do: the row simply keeps its initials.
                } finally {
                  setFilling(false);
                }
              }}
            >
              {filling ? "Fetching…" : "Get the artwork"}
            </button>
          ) : null}
          <button
            type="button"
            className="btn flex-none"
            onClick={() => setPicked(null)}
          >
            Change
          </button>
        </div>
      ) : hits.length ? (
        <ul className="flex flex-col overflow-hidden rounded-xl border border-line">
          {hits.map((hit) => (
            <li key={hit.id} className="border-b border-line last:border-b-0">
              <button
                type="button"
                className="flex w-full items-center gap-3 bg-ink px-3 py-2.5 text-left transition-colors hover:bg-board"
                onClick={() => {
                  setPicked(hit);
                  onPick({ title: hit.title, artist: hit.artist, url: hit.url, art: hit.art });
                }}
              >
                {hit.art ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={hit.art} alt="" className="size-10 flex-none rounded-md object-cover" />
                ) : (
                  <span className="size-10 flex-none rounded-md border border-line" />
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14.5px] font-medium text-bone">{hit.title}</span>
                  <span className="block truncate text-[12.5px] text-bone-dim">
                    {hit.artist}
                    {hit.year ? ` · ${hit.year}` : ""}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : !tooShort && state === "idle" ? (
        <p className="text-[13px] leading-relaxed text-bone-dim">
          Nothing found for <b className="font-medium text-bone">{query}</b>. Try the artist name as well, or just type
          it in below.
        </p>
      ) : null}

      <p className="text-[13px] leading-relaxed text-bone-dim">
        Picking one fills in the title and artist, keeps a link back, and then goes looking for the words and the
        chords. Everything it finds is yours to correct.
      </p>
    </div>
  );
}

/** The link back to where the words are, for the song page. */
export function GeniusLink({ url }: { url: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer noopener"
      className="btn flex items-center gap-1.5"
      title="Open this song on Genius in a new tab"
    >
      Open on Genius
      <ArrowSquareOut size={ICON.sm} weight="bold" />
    </a>
  );
}
