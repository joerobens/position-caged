"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useLibrary } from "@/hooks/useLibrary";
import SongForm from "@/components/SongForm";
import { GeniusLink } from "@/components/GeniusSearch";
import LyricsFinder from "@/components/LyricsFinder";
import ChordFamily from "@/components/ChordFamily";
import SongShapes from "@/components/SongShapes";
import Panel from "@/components/Panel";
import Popover from "@/components/Popover";
import AddToSet from "@/components/AddToSet";
import { CaretDown } from "@phosphor-icons/react";
import { ICON } from "@/lib/icons";
import SongsOnThis from "@/components/SongsOnThis";
import { useSession } from "@/hooks/useSession";
import { useSettings } from "@/hooks/useSettings";
import { addSong, findSong, removeSong, setLyrics } from "@/lib/songStore";
import { KEYS } from "@/lib/music";
import { effectiveCapo, needsRetune, tuningOf } from "@/lib/tunings";
import { barChords, chartChords, chordName, numberingOf, parseChord, shapeRoot } from "@/lib/nashville";

export default function SongView({ slug }: { slug: string }) {
  const library = useLibrary();
  const router = useRouter();
  const song = findSong(library, slug);
  const [transpose, setTranspose] = useState<number | null>(null);
  const [editing, setEditing] = useState(false);
  const [editingChart, setEditingChart] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const { session } = useSession();
  const { update } = useSettings();
  const found = Boolean(song);

  // Remembered so the home page can take you straight back here.
  useEffect(() => {
    if (found) update({ lastSong: slug });
  }, [found, slug, update]);

  if (!song) {
    return (
      <main className="mx-auto w-full max-w-[1180px] px-[var(--gutter)] py-10">
        <h1 className="text-[20px] font-medium">No song here</h1>
        <p className="mt-2 max-w-[60ch] text-[14px] leading-relaxed text-bone-dim">
          There is no song at <b className="font-medium text-bone">{slug}</b>. It may have been deleted, or added on a
          device that is not signed in to the same account.
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
  const numbering = numberingOf(song);
  const spellRoot = (root + (numbering.relative ? 3 : 0)) % 12;
  // With a capo on, the chord you finger is not the chord that sounds. The shapes
  // are what you need in front of you, so those are what the chart shows.
  const capo = song.capo ?? 0;
  // A uniform retuning is a capo with the sign flipped, so the two combine.
  const tuning = tuningOf(song.tuning);
  const held = effectiveCapo(capo, song.tuning);
  const playRoot = shapeRoot(spellRoot, held);
  const hasChart = song.chart.some((section) => section.bars.length > 0);
  const chords = chartChords(
    song.chart.flatMap((section) => section.bars),
    numbering.steps,
  );
  // The first section, counted from the song's own root, with its minors marked.
  const practiceHref = `/practice?topic=changes&clock=drill&key=${shapeRoot(root, held)}&tonality=${song.tonality}&song=${encodeURIComponent(
    song.slug,
  )}&bars=${encodeURIComponent(
    barChords(song.chart[0]?.bars ?? [], numbering.steps)
      .map((bar) => `${(bar.offset + (numbering.relative ? 3 : 0)) % 12}${bar.minor ? "m" : ""}`)
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

      {/* The key you are reading in, and the way to change it, in one place. */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[14px] text-bone-dim">
        <Popover
          label={`Key: ${KEYS[root]} ${song.tonality}. Play it in another key`}
          button={(open) => (
            <>
              <span className="label">Key</span>
              <b className="text-[16px] font-medium text-bone">
                {KEYS[root]} {song.tonality}
              </b>
              <CaretDown size={ICON.sm} weight="bold" style={{ transform: open ? "rotate(180deg)" : undefined }} />
            </>
          )}
        >
          {(close) => (
            <>
              <span className="label">Play it in</span>
              <div role="group" aria-label="Play it in" className="grid grid-cols-6 gap-1.5">
                {KEYS.map((name, index) => (
                  <button
                    key={name}
                    type="button"
                    className="chip px-0"
                    aria-pressed={index === root}
                    onClick={() => {
                      setTranspose(index === song.root ? null : index);
                      close();
                    }}
                  >
                    {name}
                  </button>
                ))}
              </div>
              <span className="text-[13px] text-bone-dim">Written in {KEYS[song.root]}. The numbers do not change.</span>
            </>
          )}
        </Popover>
        {transpose !== null && transpose !== song.root ? (
          <button type="button" className="btn btn-quiet" onClick={() => setTranspose(null)}>
            Back to {KEYS[song.root]}
          </button>
        ) : null}
        {capo ? <span>Capo {capo}</span> : null}
        {needsRetune(song.tuning) ? (
          <span>
            Tuned {tuning.name.toLowerCase()} <span className="font-mono text-[13px]">{tuning.label}</span>
          </span>
        ) : null}
        {held ? <span>You play {KEYS[shapeRoot(root, held)]} shapes</span> : null}
        {song.feel ? <span>{song.feel}</span> : null}
        {song.bpm ? <span>{song.bpm} bpm</span> : null}
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
        {/* The stand is worth opening with a chart alone: that is what you glance at. */}
        {lyrics || hasChart ? (
          <Link href={`/songs/${song.slug}/stand${root !== song.root ? `?key=${root}` : ""}`} className="btn btn-primary">
            Open on the stand
          </Link>
        ) : null}
        <Link href={practiceHref} className="btn">
          Practise the changes
        </Link>
        <AddToSet slug={song.slug} root={root !== song.root ? root : undefined} />
        <button type="button" className="btn" onClick={() => setEditingChart(true)}>
          Edit the song
        </button>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <button type="button" className="btn btn-quiet" onClick={() => setConfirming(true)}>
            Delete
          </button>
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

      {/* the chart, which is the reminder you actually need on a stand */}
      <Panel id="chart" label="Chart">
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
        {/* What the numbers mean in this key, so nobody has to work it out mid-song. */}
        <div className="mt-3 flex flex-wrap items-baseline gap-x-4 gap-y-1 border-t border-line pt-3 text-[13px] text-bone-dim">
          <span>{capo ? "Behind the capo you play" : `In ${KEYS[root]} that is`}</span>
          <span className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-[14px] text-bone">
            {chords.map((token) => (
              <span key={token.raw}>
                {token.raw} = {chordName(token, playRoot)}
              </span>
            ))}
          </span>
          {capo ? (
            <span className="w-full">
              It sounds in <b className="font-medium text-bone">{KEYS[root]} {song.tonality}</b>.
            </span>
          ) : null}
        </div>
      </Panel>

      <SongShapes chords={chords} playRoot={playRoot} />

      </>
      )}

      {/* your words, kept in this browser */}
      <Panel
        id="lyrics"
        label="Lyrics"
        aside={
          <div className="ml-auto flex items-center gap-2">
            {/* Where the words came from, so you can go back and check them. */}
            {song.sourceUrl ? <GeniusLink url={song.sourceUrl} /> : null}
            {lyrics || editing ? (
              <button type="button" className="btn" onClick={() => setEditing((current) => !current)}>
                {editing ? "Done" : "Edit"}
              </button>
            ) : null}
          </div>
        }
      >

        {editing ? (
          <>
            {/*
              * Fetching is part of editing, not just of starting. The words you
              * have may be the wrong take, or half a verse short, and the only
              * way to try again used to be to empty the box first.
              */}
            <div className="mt-4">
              <LyricsFinder
                track={song.title}
                artist={song.credit.trim().toLowerCase() === "traditional" ? "" : song.credit}
                onPick={(found) => setLyrics(song.slug, found)}
                replacing={Boolean(lyrics.trim())}
              />
            </div>
            <textarea
              value={lyrics}
              onChange={(event) => setLyrics(song.slug, event.target.value)}
              rows={14}
              placeholder="Paste the words here."
              aria-label="Lyrics"
              className="mt-3 w-full rounded-xl border border-line bg-ink p-3 text-[15px] leading-relaxed text-bone outline-none placeholder:text-bone-dim focus-visible:border-bone-dim"
            />
            <p className="mt-2 text-[13px] leading-relaxed text-bone-dim">
              {session
                ? "Saved as you type, and synced to your other devices."
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
              No words yet.
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
      </Panel>

      {/* For learning the song rather than playing it, so they come last and start folded. */}
      {!editingChart ? (
        <>
          <ChordFamily
            root={root}
            tonality={song.tonality}
            numbering={numbering}
            used={song.chart.flatMap((section) => section.bars)}
          />
          <SongsOnThis bars={song.chart[0]?.bars ?? []} />
        </>
      ) : null}
    </main>
  );
}
