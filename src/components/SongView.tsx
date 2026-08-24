"use client";

import { useState } from "react";
import Link from "next/link";
import { useLibrary } from "@/hooks/useLibrary";
import { findSong, setLyrics } from "@/lib/songStore";
import { KEYS } from "@/lib/music";
import { barOffsets, chartChords, chordName, numberingOf, parseChord } from "@/lib/nashville";

export default function SongView({ slug }: { slug: string }) {
  const library = useLibrary();
  const song = findSong(library, slug);
  const [transpose, setTranspose] = useState<number | null>(null);
  const [editing, setEditing] = useState(false);

  if (!song) {
    return (
      <main className="mx-auto w-full max-w-[1180px] px-[var(--gutter)] py-10">
        <h1 className="text-[20px] font-medium">No song here</h1>
        <p className="mt-2 max-w-[60ch] text-[14px] leading-relaxed text-bone-dim">
          Nothing in the library has the slug <b className="font-medium text-bone">{slug}</b>. If you added it in
          another browser it will not be here, because your own songs stay on the device you added them to.
        </p>
        <Link href="/songs" className="chip mt-4 inline-flex">
          Back to songs
        </Link>
      </main>
    );
  }

  const root = transpose ?? song.root;
  const lyrics = library.lyrics[song.slug] ?? "";
  // A minor chart is numbered from its relative major, so that is what the
  // numbers are counted and spelled against.
  const numbering = numberingOf(song);
  const spellRoot = (root + (numbering.relative ? 3 : 0)) % 12;
  const chords = chartChords(
    song.chart.flatMap((section) => section.bars),
    numbering.steps,
  );
  const practiceHref = `/play?mode=practice&drill=changes&key=${root}&tonality=${song.tonality}&bars=${encodeURIComponent(
    barOffsets(song.chart[0].bars, numbering.steps)
      .map((offset) => (offset + (numbering.relative ? 3 : 0)) % 12)
      .join(","),
  )}`;

  return (
    <main className="mx-auto w-full max-w-[1180px] px-[var(--gutter)] py-7 pb-16">
      <Link href="/songs" className="text-[13px] text-bone-dim hover:text-bone">
        &larr; Songs
      </Link>

      <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h1 className="text-[24px] font-medium tracking-tight">{song.title}</h1>
        <span className="text-[15px] text-bone-dim">{song.credit}</span>
      </div>

      <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 font-mono text-[12px] text-bone-dim">
        <span>
          key <b className="font-medium text-bone">{KEYS[root]} {song.tonality}</b>
          {transpose !== null && transpose !== song.root ? ` (written in ${KEYS[song.root]})` : ""}
        </span>
        {song.capo ? <span>capo <b className="font-medium text-bone">{song.capo}</b></span> : null}
        {song.feel ? <span>feel <b className="font-medium text-bone">{song.feel}</b></span> : null}
        {song.bpm ? <span><b className="font-medium text-bone">{song.bpm}</b> bpm</span> : null}
      </div>

      {song.note ? (
        <p className="mt-3 max-w-[74ch] text-[13px] leading-relaxed text-bone-dim">{song.note}</p>
      ) : null}

      {/* the chart, which is the reminder you actually need on a stand */}
      <section className="panel mt-5" aria-label="Chart">
        {song.chart.map((section) => (
          <div key={section.name} className="border-b border-line py-3 first:pt-0 last:border-b-0 last:pb-0">
            <span className="label">{section.name}</span>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {section.bars.map((bar, index) => {
                const token = parseChord(bar, numbering.steps);
                return (
                  <div
                    key={index}
                    className="min-w-[64px] rounded-lg border border-line bg-ink px-2 py-1.5 text-center"
                  >
                    <div className="font-mono text-[15px] font-medium">{bar}</div>
                    <div className="mt-0.5 font-mono text-[10px] text-bone-dim">
                      {token && !token.hold ? chordName(token, spellRoot) : " "}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </section>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-[13px] text-bone-dim">In {KEYS[root]} that is</span>
        {chords.map((token) => (
          <span key={token.raw} className="chip chip-sm font-mono">
            {token.raw} = {chordName(token, spellRoot)}
          </span>
        ))}
        <Link
          href={practiceHref}
          className="chip ml-auto"
          style={{ background: "var(--accent)", borderColor: "var(--accent)", color: "var(--color-ink)", fontWeight: 500 }}
        >
          Practise these changes
        </Link>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="label">Play it in</span>
        {KEYS.map((name, index) => (
          <button
            key={name}
            type="button"
            className="chip chip-sm"
            aria-pressed={index === root}
            onClick={() => setTranspose(index)}
          >
            {name}
          </button>
        ))}
      </div>

      {/* your words, kept in this browser */}
      <section className="panel mt-6" aria-label="Lyrics">
        <div className="flex items-center gap-2">
          <span className="label">Lyrics</span>
          <div className="ml-auto flex items-center gap-2">
            {lyrics ? (
              <Link
                href={`/songs/${song.slug}/play`}
                className="chip chip-sm"
                style={{ background: "var(--accent)", borderColor: "var(--accent)", color: "var(--color-ink)", fontWeight: 500 }}
              >
                Put it on the stand
              </Link>
            ) : null}
            <button type="button" className="chip chip-sm" onClick={() => setEditing((current) => !current)}>
              {editing ? "Done" : lyrics ? "Edit" : "Add"}
            </button>
          </div>
        </div>
        {editing ? (
          <>
            <textarea
              value={lyrics}
              onChange={(event) => setLyrics(song.slug, event.target.value)}
              rows={14}
              placeholder="Paste the words here."
              className="mt-3 w-full rounded-xl border border-line bg-ink p-3 text-[15px] leading-relaxed text-bone outline-none placeholder:text-bone-dim focus-visible:border-bone-dim"
            />
            <p className="mt-2 text-[13px] leading-relaxed text-bone-dim">
              Stored in this browser only, never sent anywhere and never committed. It will not follow you to another
              device.
            </p>
          </>
        ) : lyrics ? (
          <pre className="mt-3 whitespace-pre-wrap font-[family-name:var(--font-display)] text-[18px] leading-[1.85] text-bone">
            {lyrics}
          </pre>
        ) : (
          <p className="mt-3 text-[13px] leading-relaxed text-bone-dim">
            No words yet. Press Add and paste them in; they stay on this device.
          </p>
        )}
      </section>
    </main>
  );
}
