"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useLibrary } from "@/hooks/useLibrary";
import SongForm from "@/components/SongForm";
import { GeniusLink } from "@/components/GeniusSearch";
import LyricsFinder from "@/components/LyricsFinder";
import ChordFamily from "@/components/ChordFamily";
import { useSession } from "@/hooks/useSession";
import { addSong, findSong, hideSeeded, removeSong, setLyrics, slugify } from "@/lib/songStore";
import { KEYS } from "@/lib/music";
import { effectiveCapo, needsRetune, tuningOf } from "@/lib/tunings";
import { barOffsets, chartChords, chordName, numberingOf, parseChord, shapeRoot } from "@/lib/nashville";

export default function SongView({ slug }: { slug: string }) {
  const library = useLibrary();
  const router = useRouter();
  const song = findSong(library, slug);
  const [transpose, setTranspose] = useState<number | null>(null);
  const [editing, setEditing] = useState(false);
  const [editingChart, setEditingChart] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const { session } = useSession();

  if (!song) {
    return (
      <main className="mx-auto w-full max-w-[1180px] px-[var(--gutter)] py-10">
        <h1 className="text-[20px] font-medium">No song here</h1>
        <p className="mt-2 max-w-[60ch] text-[14px] leading-relaxed text-bone-dim">
          Nothing in the library has the slug <b className="font-medium text-bone">{slug}</b>. If you added it in
          another browser it will not be here, because your own songs stay on the device you added them to.
        </p>
        <Link href="/songs" className="btn mt-4 inline-flex">
          Back to songs
        </Link>
      </main>
    );
  }

  const root = transpose ?? song.root;
  const lyrics = library.lyrics[song.slug] ?? "";
  // A minor chart is numbered from its relative major, so that is what the
  // numbers are counted and spelled against.
  const mine = library.own.some((entry) => entry.slug === song.slug);
  const numbering = numberingOf(song);
  const spellRoot = (root + (numbering.relative ? 3 : 0)) % 12;
  // With a capo on, the chord you finger is not the chord that sounds. The shapes
  // are what you need in front of you, so those are what the chart shows.
  const capo = song.capo ?? 0;
  // A uniform retuning is a capo with the sign flipped, so the two combine.
  const tuning = tuningOf(song.tuning);
  const held = effectiveCapo(capo, song.tuning);
  const playRoot = shapeRoot(spellRoot, held);
  const chords = chartChords(
    song.chart.flatMap((section) => section.bars),
    numbering.steps,
  );
  const practiceHref = `/play?mode=practice&drill=changes&key=${shapeRoot(root, held)}&tonality=${song.tonality}&bars=${encodeURIComponent(
    barOffsets(song.chart[0].bars, numbering.steps)
      .map((offset) => (offset + (numbering.relative ? 3 : 0)) % 12)
      .join(","),
  )}`;

  return (
    <main className="mx-auto w-full max-w-[1180px] px-[var(--gutter)] py-7 pb-16">
      <Link href="/songs" className="-my-2 inline-flex min-h-11 items-center text-[13px] text-bone-dim hover:text-bone">
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
        {needsRetune(song.tuning) ? (
          <span>
            tuned <b className="font-medium text-bone">{tuning.name.toLowerCase()}</b>{" "}
            <span className="text-bone-dim">{tuning.label}</span>
          </span>
        ) : null}
        {capo ? <span>capo <b className="font-medium text-bone">{capo}</b></span> : null}
        {held ? (
          <span>
            so you play in <b className="font-medium text-bone">{KEYS[shapeRoot(root, held)]}</b>
          </span>
        ) : null}
        {song.feel ? <span>feel <b className="font-medium text-bone">{song.feel}</b></span> : null}
        {song.bpm ? <span><b className="font-medium text-bone">{song.bpm}</b> bpm</span> : null}
      </div>

      {song.note ? (
        <p className="mt-3 max-w-[74ch] text-[13px] leading-relaxed text-bone-dim">{song.note}</p>
      ) : null}

      {editingChart ? (
        <div className="mt-5">
          <SongForm
            initial={song}
            submitLabel="Save the changes"
            onCancel={() => setEditingChart(false)}
            onSave={(next) => {
              addSong({ ...next, slug: song.slug });
              setEditingChart(false);
            }}
          />
        </div>
      ) : (
      <>
      {/* Everything you can do to this song, in one place. */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {lyrics ? (
          <Link href={`/songs/${song.slug}/play`} className="btn btn-primary">
            Put it on the stand
          </Link>
        ) : null}
        <Link href={practiceHref} className="btn">
          Practise these changes
        </Link>
        {mine ? (
          <button type="button" className="btn" onClick={() => setEditingChart(true)}>
            Edit the song
          </button>
        ) : (
          <button
            type="button"
            className="btn"
            onClick={() => {
              const copy = slugify(`${song.title} mine`, library);
              addSong({ ...song, slug: copy, credit: song.credit });
              router.push(`/songs/${copy}`);
            }}
          >
            Make a copy I can edit
          </button>
        )}
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {mine ? (
            <button type="button" className="btn btn-quiet" onClick={() => setConfirming(true)}>
              Delete
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-quiet"
              onClick={() => {
                hideSeeded(song.slug);
                router.push("/songs");
              }}
            >
              Hide from my library
            </button>
          )}
        </div>
      </div>

      {confirming ? (
        <div className="panel mt-3 flex flex-wrap items-center gap-3">
          <span className="text-[13px] leading-relaxed text-bone-dim">
            Delete <b className="font-medium text-bone">{song.title}</b>?{" "}
            {lyrics ? "The words go with it, on every device. " : ""}This cannot be undone.
          </span>
          <div className="ml-auto flex gap-2">
            <button type="button" className="btn" onClick={() => setConfirming(false)}>
              Keep it
            </button>
            <button
              type="button"
              className="btn btn-quiet"
              onClick={() => {
                removeSong(song.slug);
                router.push("/songs");
              }}
            >
              Yes, delete it
            </button>
          </div>
        </div>
      ) : null}

      {!mine ? (
        <p className="mt-3 max-w-[70ch] text-[13px] leading-relaxed text-bone-dim">
          This one ships with the app, so it cannot be edited or deleted. Copy it to make it yours, or hide it to get
          it out of the list.
        </p>
      ) : null}

      {/* the chart, which is the reminder you actually need on a stand */}
      <section className="panel mt-5" aria-label="Chart">
        {song.chart.map((section, sectionIndex) => (
          <div key={sectionIndex} className="border-b border-line py-3 first:pt-0 last:border-b-0 last:pb-0">
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
                      {token && !token.hold ? chordName(token, playRoot) : " "}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </section>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-[13px] text-bone-dim">
          {capo ? `Behind the capo you play` : `In ${KEYS[root]} that is`}
        </span>
        <span className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-[13px] text-bone">
          {chords.map((token) => (
            <span key={token.raw}>
              {token.raw} = {chordName(token, playRoot)}
            </span>
          ))}
        </span>
        {capo ? (
          <span className="w-full text-[13px] leading-relaxed text-bone-dim">
            Sounding in <b className="font-medium text-bone">{KEYS[root]} {song.tonality}</b>, which is what anyone
            playing along without a capo needs to know.
          </span>
        ) : null}
      </div>

      <ChordFamily
        root={root}
        tonality={song.tonality}
        numbering={numbering}
        used={song.chart.flatMap((section) => section.bars)}
      />

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

      </>
      )}

      {/* your words, kept in this browser */}
      <section className="panel mt-6" aria-label="Lyrics">
        <div className="flex items-center gap-2">
          <span className="label">Lyrics</span>
          <div className="ml-auto flex items-center gap-2">
            {/* Where the words came from, so you can go back and check them. */}
            {song.sourceUrl ? <GeniusLink url={song.sourceUrl} /> : null}
            {lyrics || editing ? (
              <button type="button" className="btn" onClick={() => setEditing((current) => !current)}>
                {editing ? "Done" : "Edit"}
              </button>
            ) : null}
          </div>
        </div>

        {editing ? (
          <>
            <textarea
              value={lyrics}
              onChange={(event) => setLyrics(song.slug, event.target.value)}
              rows={14}
              placeholder="Paste the words here."
              aria-label="Lyrics"
              className="mt-4 w-full rounded-xl border border-line bg-ink p-3 text-[15px] leading-relaxed text-bone outline-none placeholder:text-bone-dim focus-visible:border-bone-dim"
            />
            <p className="mt-2 text-[13px] leading-relaxed text-bone-dim">
              {session
                ? "Saved as you type, and synced to your other devices. Never committed to the repo."
                : "Saved as you type, in this browser only. Sign in from Account to keep them across devices."}
            </p>
          </>
        ) : lyrics ? (
          <pre className="mt-4 whitespace-pre-wrap font-[family-name:var(--font-display)] text-[18px] leading-[1.85] text-bone">
            {lyrics}
          </pre>
        ) : (
          /* Empty state: say what is missing, then offer both ways to fix it. */
          <div className="mt-4 flex flex-col gap-4">
            <p className="max-w-[58ch] text-[14px] leading-relaxed text-bone-dim">
              No words yet. They are not in the chart, so they have to come from somewhere else.
            </p>
            <LyricsFinder
              track={song.title}
              artist={song.credit === "traditional" ? "" : song.credit}
              onPick={(found) => {
                setLyrics(song.slug, found);
                setEditing(true);
              }}
            >
              <button type="button" className="btn whitespace-nowrap" onClick={() => setEditing(true)}>
                Paste them in
              </button>
            </LyricsFinder>
          </div>
        )}
      </section>
    </main>
  );
}
