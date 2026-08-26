"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Plus, X } from "@phosphor-icons/react";
import { useLibrary } from "@/hooks/useLibrary";
import { allSongs, findSet, moveInSet, removeSet, saveSet } from "@/lib/songStore";
import { KEYS } from "@/lib/music";
import { needsRetune, tuningOf } from "@/lib/tunings";
import { ICON } from "@/lib/icons";

export default function SetEditor({ id }: { id: string }) {
  const library = useLibrary();
  const router = useRouter();
  const set = findSet(library, id);
  const [adding, setAdding] = useState(false);
  const [confirming, setConfirming] = useState(false);

  if (!set) {
    return (
      <main className="mx-auto w-full max-w-[1180px] px-[var(--gutter)] py-10">
        <h1 className="text-[20px] font-medium">No set here</h1>
        <p className="mt-2 max-w-[60ch] text-[14px] leading-relaxed text-bone-dim">
          Sets live in the browser you made them in, so this one will not be here if you made it somewhere else.
        </p>
        <Link href="/sets" className="btn mt-4 inline-flex">
          Back to sets
        </Link>
      </main>
    );
  }

  const songs = allSongs(library);
  const inSet = set.slugs.map((slug) => songs.find((song) => song.slug === slug)).filter(Boolean);
  const available = songs.filter((song) => !set.slugs.includes(song.slug));
  const first = set.slugs[0];

  return (
    <main className="mx-auto w-full max-w-[1180px] px-[var(--gutter)] py-7 pb-16">
      <Link href="/sets" className="text-[13px] text-bone-dim hover:text-bone">
        &larr; Sets
      </Link>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <input
          value={set.name}
          onChange={(event) => saveSet({ ...set, name: event.target.value })}
          aria-label="Set name"
          className="min-w-0 flex-1 rounded-[10px] border border-transparent bg-transparent text-[24px] font-medium tracking-tight text-bone outline-none hover:border-line focus-visible:border-bone-dim"
        />
      </div>

      {/* Everything you can do to this set, in one place. */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {first ? (
          <Link href={`/songs/${first}/play?set=${set.id}`} className="btn btn-primary">
            Put the set on the stand
          </Link>
        ) : null}
        <button type="button" className="btn" onClick={() => setAdding((open) => !open)}>
          {adding ? null : <Plus size={ICON.sm} weight="bold" />}
          {adding ? "Done adding" : "Add a song"}
        </button>
        <button type="button" className="btn btn-quiet ml-auto" onClick={() => setConfirming(true)}>
          Delete this set
        </button>
      </div>

      {confirming ? (
        <div className="panel mt-3 flex flex-wrap items-center gap-3">
          <span className="text-[13px] leading-relaxed text-bone-dim">
            Delete <b className="font-medium text-bone">{set.name}</b>? The songs stay in your library; only the
            running order goes.
          </span>
          <div className="ml-auto flex gap-2">
            <button type="button" className="btn" onClick={() => setConfirming(false)}>
              Keep it
            </button>
            <button
              type="button"
              className="btn btn-quiet"
              onClick={() => {
                removeSet(set.id);
                router.push("/sets");
              }}
            >
              Yes, delete it
            </button>
          </div>
        </div>
      ) : null}

      {inSet.length === 0 ? (
        <p className="mt-5 rounded-xl border border-line bg-panel p-4 text-[13px] leading-relaxed text-bone-dim">
          Nothing in this set yet. Add a song below.
        </p>
      ) : (
        <ol className="mt-5 overflow-hidden rounded-xl border border-line">
          {inSet.map((song, index) => (
            <li key={song!.slug} className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-line bg-panel px-3 py-2.5 last:border-b-0">
              <span className="w-6 flex-none text-center font-mono text-[13px] text-bone-dim">{index + 1}</span>
              <Link href={`/songs/${song!.slug}`} className="min-w-0 flex-1 truncate text-[15px] font-medium hover:text-bone-dim">
                {song!.title}
              </Link>
              {needsRetune(song!.tuning) ? (
                <span className="flex-none rounded-[5px] bg-bone px-1.5 py-0.5 font-mono text-[11px] font-medium text-ink">
                  {tuningOf(song!.tuning).label}
                </span>
              ) : null}
              {library.lyrics[song!.slug]?.trim() ? null : (
                <span className="flex-none font-mono text-[11px] text-bone-dim">no words</span>
              )}
              <span className="flex-none font-mono text-[12px] text-bone-dim">
                {KEYS[song!.root]} {song!.tonality}
              </span>
              <span className="flex flex-none gap-1.5">
                <button
                  type="button"
                  className="btn px-2.5"
                  aria-label={`Move ${song!.title} earlier`}
                  disabled={index === 0}
                  onClick={() => saveSet(moveInSet(set, index, -1))}
                >
                  <ArrowUp size={ICON.sm} weight="bold" />
                </button>
                <button
                  type="button"
                  className="btn px-2.5"
                  aria-label={`Move ${song!.title} later`}
                  disabled={index === inSet.length - 1}
                  onClick={() => saveSet(moveInSet(set, index, 1))}
                >
                  <ArrowDown size={ICON.sm} weight="bold" />
                </button>
                <button
                  type="button"
                  className="btn px-2.5"
                  aria-label={`Take ${song!.title} out`}
                  onClick={() => saveSet({ ...set, slugs: set.slugs.filter((slug) => slug !== song!.slug) })}
                >
                  <X size={ICON.sm} weight="bold" />
                </button>
              </span>
            </li>
          ))}
        </ol>
      )}

      {adding ? (
        available.length ? (
          <div className="panel mt-4">
            <span className="label">Add to the set</span>
            <ul className="mt-2">
              {available.map((song) => (
                <li key={song.slug} className="border-b border-line last:border-b-0">
                  <button
                    type="button"
                    onClick={() => saveSet({ ...set, slugs: [...set.slugs, song.slug] })}
                    className="flex min-h-11 w-full items-center gap-3 py-2.5 text-left transition-opacity hover:opacity-70 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-bone"
                  >
                    <span className="min-w-0 flex-1 truncate text-[15px]">{song.title}</span>
                    <span className="flex-none text-[13px] text-bone-dim">{song.credit}</span>
                    <span className="flex-none font-mono text-[12px] text-bone-dim">
                      {KEYS[song.root]} {song.tonality}
                    </span>
                    <Plus size={ICON.sm} weight="bold" className="flex-none text-bone-dim" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="mt-4 text-[13px] leading-relaxed text-bone-dim">
            Every song in the library is already in this set.
          </p>
        )
      ) : null}

    </main>
  );
}
