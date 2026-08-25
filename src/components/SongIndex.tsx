"use client";

import { Fragment, useMemo, useState } from "react";
import Link from "next/link";
import { MagnifyingGlass } from "@phosphor-icons/react";
import { useLibrary } from "@/hooks/useLibrary";
import { allSongs, isSeeded, unhideSeeded } from "@/lib/songStore";
import { KEYS } from "@/lib/music";
import { chartChords, numberingOf } from "@/lib/nashville";
import { ICON } from "@/lib/icons";

export default function SongIndex() {
  const library = useLibrary();
  const [query, setQuery] = useState("");
  const songs = allSongs(library);

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return songs
      .map((song) => {
        const bars = song.chart.flatMap((section) => section.bars);
        const chords = chartChords(bars, numberingOf(song).steps);
        return {
          song,
          numbers: chords.map((token) => token.raw).join(" "),
          key: `${KEYS[song.root]}${song.tonality === "minor" ? " minor" : " major"}`,
          mine: !isSeeded(song.slug),
          hasLyrics: Boolean(library.lyrics[song.slug]?.trim()),
        };
      })
      .filter((row) =>
        !needle
          ? true
          : [row.song.title, row.song.credit, row.numbers, row.key].join(" ").toLowerCase().includes(needle),
      );
  }, [songs, query, library]);

  return (
    <>
      <div className="mt-5 flex items-center gap-2.5 rounded-xl border border-line bg-panel px-3">
        <MagnifyingGlass size={ICON.md} weight="bold" className="flex-none text-bone-dim" />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search songs, keys, or numbers"
          aria-label="Search songs"
          className="min-h-11 w-full bg-transparent text-sm text-bone outline-none placeholder:text-bone-dim"
        />
      </div>

      {rows.length === 0 ? (
        <p className="mt-6 rounded-xl border border-line bg-panel p-4 text-[13px] leading-relaxed text-bone-dim">
          Nothing matches <b className="font-medium text-bone">{query}</b>. Try a chord number like{" "}
          <b className="font-medium text-bone">4</b>, a key like <b className="font-medium text-bone">G</b>, or clear
          the box to see everything.
        </p>
      ) : (
        <ul className="mt-4 overflow-hidden rounded-xl border border-line">
          {rows.map(({ song, numbers, key, mine, hasLyrics }, index) => (
            <Fragment key={song.slug}>
              {/* One heading where yours end and the starter charts begin. */}
              {!mine && (index === 0 || rows[index - 1].mine) && rows.some((row) => row.mine) ? (
                <li className="border-b border-line bg-ink px-4 py-2">
                  <span className="label">Starter charts</span>
                </li>
              ) : null}
              {mine && index === 0 ? (
                <li className="border-b border-line bg-ink px-4 py-2">
                  <span className="label">Your songs</span>
                </li>
              ) : null}
            <li className="border-b border-line last:border-b-0">
              <Link
                href={`/songs/${song.slug}`}
                className="flex flex-wrap items-center gap-x-4 gap-y-1 bg-panel px-4 py-3 transition-colors hover:bg-board"
              >
                <span className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2">
                  <b className="text-[15px] font-medium">{song.title}</b>
                  <span className="text-[13px] text-bone-dim">{song.credit}</span>
                  {hasLyrics ? <span className="label">lyrics</span> : null}
                </span>
                <span className="font-mono text-[12px]" style={{ color: "var(--accent)" }}>
                  {numbers}
                </span>
                <span className="w-[76px] flex-none text-right font-mono text-[12px] text-bone-dim">{key}</span>
              </Link>
            </li>
            </Fragment>
          ))}
        </ul>
      )}

      {library.hidden.length ? (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-[13px] text-bone-dim">
            {library.hidden.length} seeded chart{library.hidden.length === 1 ? " is" : "s are"} hidden:
          </span>
          {library.hidden.map((slug) => (
            <button key={slug} type="button" className="chip chip-sm" onClick={() => unhideSeeded(slug)}>
              Bring back {slug.replace(/-/g, " ")}
            </button>
          ))}
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Link href="/songs/new" className="chip">
          Add a song
        </Link>
        <span className="text-[13px] text-bone-dim">
          Charts here are traditional. Anything you add stays in this browser unless you{" "}
          <Link href="/account" className="text-bone underline decoration-line underline-offset-2">
            sign in
          </Link>
          .
        </span>
      </div>


    </>
  );
}
