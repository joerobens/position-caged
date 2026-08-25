"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Plus, X } from "@phosphor-icons/react";
import { useLibrary } from "@/hooks/useLibrary";
import { allSongs, findSet, moveInSet, removeSet, saveSet } from "@/lib/songStore";
import { KEYS } from "@/lib/music";
import { ICON } from "@/lib/icons";

export default function SetEditor({ id }: { id: string }) {
  const library = useLibrary();
  const router = useRouter();
  const set = findSet(library, id);
  const [adding, setAdding] = useState(false);

  if (!set) {
    return (
      <main className="mx-auto w-full max-w-[1180px] px-[var(--gutter)] py-10">
        <h1 className="text-[20px] font-medium">No set here</h1>
        <p className="mt-2 max-w-[60ch] text-[14px] leading-relaxed text-bone-dim">
          Sets live in the browser you made them in, so this one will not be here if you made it somewhere else.
        </p>
        <Link href="/sets" className="chip mt-4 inline-flex">
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
        {first ? (
          <Link
            href={`/songs/${first}/play?set=${set.id}`}
            className="chip flex-none"
            style={{ background: "var(--accent)", borderColor: "var(--accent)", color: "var(--on-accent)", fontWeight: 500 }}
          >
            Put the set on the stand
          </Link>
        ) : null}
      </div>

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
              <span className="flex-none font-mono text-[12px] text-bone-dim">
                {KEYS[song!.root]} {song!.tonality}
              </span>
              <span className="flex flex-none gap-1.5">
                <button
                  type="button"
                  className="chip px-2.5"
                  aria-label={`Move ${song!.title} earlier`}
                  disabled={index === 0}
                  style={{ opacity: index === 0 ? 0.3 : 1 }}
                  onClick={() => saveSet(moveInSet(set, index, -1))}
                >
                  <ArrowUp size={ICON.sm} weight="bold" />
                </button>
                <button
                  type="button"
                  className="chip px-2.5"
                  aria-label={`Move ${song!.title} later`}
                  disabled={index === inSet.length - 1}
                  style={{ opacity: index === inSet.length - 1 ? 0.3 : 1 }}
                  onClick={() => saveSet(moveInSet(set, index, 1))}
                >
                  <ArrowDown size={ICON.sm} weight="bold" />
                </button>
                <button
                  type="button"
                  className="chip px-2.5"
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

      <div className="mt-4">
        <button type="button" className="chip flex items-center gap-2" onClick={() => setAdding((open) => !open)}>
          <Plus size={ICON.sm} weight="bold" />
          Add a song
        </button>
        {adding ? (
          available.length ? (
            <ul className="mt-3 flex flex-wrap gap-2">
              {available.map((song) => (
                <li key={song.slug}>
                  <button
                    type="button"
                    className="chip"
                    onClick={() => saveSet({ ...set, slugs: [...set.slugs, song.slug] })}
                  >
                    {song.title}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-[13px] leading-relaxed text-bone-dim">
              Every song in the library is already in this set.
            </p>
          )
        ) : null}
      </div>

      <button
        type="button"
        className="chip mt-8 text-bone-dim"
        onClick={() => {
          removeSet(set.id);
          router.push("/sets");
        }}
      >
        Delete this set
      </button>
    </main>
  );
}
