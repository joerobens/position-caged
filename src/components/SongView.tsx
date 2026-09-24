"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { DotsThree, PencilSimple } from "@phosphor-icons/react";
import { useLibrary } from "@/hooks/useLibrary";
import SongForm from "@/components/SongForm";
import { GeniusLink } from "@/components/GeniusSearch";
import LyricsFinder from "@/components/LyricsFinder";
import ChartFinder from "@/components/ChartFinder";
import ChartTemplates from "@/components/ChartTemplates";
import ChartView from "@/components/ChartView";
import ChordFamily from "@/components/ChordFamily";
import SongShapes from "@/components/SongShapes";
import SongsOnThis from "@/components/SongsOnThis";
import KeyLine from "@/components/KeyLine";
import Popover from "@/components/Popover";
import AddToSet from "@/components/AddToSet";
import { useSettings } from "@/hooks/useSettings";
import { addSong, findSong, removeSong, setLyrics } from "@/lib/songStore";
import { nextSectionName } from "@/lib/chartTemplates";
import { effectiveCapo } from "@/lib/tunings";
import { barChords, chartChords, numberingOf, shapeRoot } from "@/lib/nashville";
import { ICON } from "@/lib/icons";

function initials(title: string) {
  return title
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join("");
}

/**
 * A song, ready to play. The key line says what your hands do, the chart reads
 * from the stand, and anything wrong is fixed where it stands: a chart line, the
 * words, or the key. Everything for learning the song sits folded at the foot.
 */
export default function SongView({ slug }: { slug: string }) {
  const library = useLibrary();
  const router = useRouter();
  const song = findSong(library, slug);
  // A key and capo to play it in for now, without changing the song.
  const [now, setNow] = useState<{ root: number; capo: number } | null>(null);
  const [details, setDetails] = useState(false);
  const [editingWords, setEditingWords] = useState(false);
  const [draft, setDraft] = useState("");
  const [confirming, setConfirming] = useState(false);
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

  const written = { root: song.root, capo: song.capo ?? 0 };
  const root = now?.root ?? written.root;
  const capo = now?.capo ?? written.capo;
  const moved = root !== written.root || capo !== written.capo;
  const lyrics = library.lyrics[song.slug] ?? "";
  const hasChart = song.chart.some((section) => section.bars.length > 0);
  // A minor chart is numbered from its relative major, so that is what the
  // numbers are counted and spelled against.
  const numbering = numberingOf({ ...song, root });
  const held = effectiveCapo(capo, song.tuning);
  // The shapes under your fingers, which is what the chart shows.
  const playRoot = shapeRoot(numbering.root, held);
  const bars = song.chart.flatMap((section) => section.bars);
  const chords = chartChords(bars, numbering.steps);
  const save = (patch: Partial<typeof song>) => addSong({ ...song, ...patch });

  // The first section, counted from the song's own root, with its minors marked.
  const practiceHref = `/practice?topic=changes&clock=drill&key=${shapeRoot(root, held)}&tonality=${song.tonality}&song=${encodeURIComponent(
    song.slug,
  )}&bars=${encodeURIComponent(
    barChords(song.chart[0]?.bars ?? [], numbering.steps)
      .map((bar) => `${(bar.offset + (numbering.relative ? 3 : 0)) % 12}${bar.minor ? "m" : ""}`)
      .join(","),
  )}`;
  const standHref = `/songs/${song.slug}/stand${moved ? `?key=${root}&capo=${capo}` : ""}`;
  const feel = [song.feel, song.bpm ? `${song.bpm} bpm` : null].filter(Boolean).join(" · ");

  return (
    <main className="mx-auto flex w-full max-w-[1180px] flex-col gap-4 px-[var(--gutter)] py-7 pb-16">
      <Link href="/songs" className="-my-2 inline-flex min-h-11 items-center self-start text-[13px] text-bone-dim hover:text-bone">
        &larr; Songs
      </Link>

      <div className="flex items-center gap-4">
        {song.art ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={song.art} alt="" className="size-16 flex-none rounded-xl border border-line object-cover" />
        ) : (
          <span
            aria-hidden
            className="flex size-16 flex-none items-center justify-center rounded-xl border border-line font-mono text-[14px] text-bone-dim"
          >
            {initials(song.title)}
          </span>
        )}
        <div className="min-w-0">
          <h1 className="text-[28px] font-medium leading-tight tracking-tight">{song.title}</h1>
          <p className="text-[16px] text-bone-dim">{song.credit}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <KeyLine
          written={written}
          root={root}
          capo={capo}
          tonality={song.tonality}
          tuning={song.tuning}
          onChange={(nextRoot, nextCapo) =>
            setNow(nextRoot === written.root && nextCapo === written.capo ? null : { root: nextRoot, capo: nextCapo })
          }
          onKeep={() => {
            save({ root, capo: capo || undefined });
            setNow(null);
          }}
        />
        {feel ? <span className="text-[15px] text-bone-dim">{feel}</span> : null}
      </div>

      {/* The note is about the song as written, so it steps aside while you play it elsewhere. */}
      {song.note && !moved ? <p className="max-w-[65ch] text-[14px] leading-relaxed text-bone-dim">{song.note}</p> : null}

      {/* One thing to do most of the time, two often, the rest out of the way. */}
      <div className="flex flex-wrap items-center gap-2">
        {lyrics || hasChart ? (
          <Link href={standHref} className="btn btn-primary">
            Open on the stand
          </Link>
        ) : null}
        {hasChart ? (
          <Link href={practiceHref} className="btn">
            Practise the changes
          </Link>
        ) : null}
        <AddToSet slug={song.slug} root={root !== song.root ? root : undefined} />
        <div className="ml-auto">
          <Popover
            label="More"
            className="left-auto right-0"
            buttonClassName="border-transparent bg-transparent text-bone-dim"
            button={() => (
              <>
                <DotsThree size={ICON.md} weight="bold" />
                More
              </>
            )}
          >
            {(close) =>
              confirming ? (
                <>
                  <span className="text-[14px] leading-relaxed text-bone-dim">
                    Delete <b className="font-medium text-bone">{song.title}</b>?{" "}
                    {lyrics ? "The words go with it, on every device. " : ""}This cannot be undone.
                  </span>
                  <div className="flex gap-2">
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
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className="btn justify-start"
                    onClick={() => {
                      setDetails(true);
                      close();
                    }}
                  >
                    Edit all details
                  </button>
                  <button type="button" className="btn btn-quiet justify-start" onClick={() => setConfirming(true)}>
                    Delete this song
                  </button>
                </>
              )
            }
          </Popover>
        </div>
      </div>

      {details ? (
        <SongForm
          initial={song}
          submitLabel="Save the changes"
          onCancel={() => setDetails(false)}
          onSave={(next) => {
            addSong({ ...next, slug: song.slug });
            setDetails(false);
            setNow(null);
          }}
        />
      ) : (
        <>
          <section className="panel" aria-label="Chart">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="label">Chart</span>
              {hasChart ? <span className="text-[13px] text-bone-dim">Tap a line to fix it</span> : null}
            </div>
            {hasChart ? null : (
              <div className="mt-3 flex flex-col gap-3">
                <p className="text-[14px] text-bone-dim">
                  No chart yet. Look for one, start from a common progression, or add a line.
                </p>
                <ChartFinder
                  track={song.title}
                  artist={song.credit.trim().toLowerCase() === "traditional" ? "" : song.credit}
                  onFound={(chart) =>
                    save({
                      root: chart.root,
                      tonality: chart.tonality,
                      numbering: chart.numbering,
                      capo: chart.capo || undefined,
                      tuning: chart.tuning && chart.tuning !== "standard" ? chart.tuning : song.tuning,
                      chart: chart.chart,
                    })
                  }
                />
                <ChartTemplates
                  steps={numbering.steps}
                  relative={numbering.relative}
                  tonality={song.tonality}
                  onPick={(line) =>
                    save({
                      chart: [
                        ...song.chart,
                        { name: nextSectionName(song.chart.length), bars: line.split(/[|\s]+/).filter(Boolean) },
                      ],
                    })
                  }
                />
              </div>
            )}
            <div className="mt-2">
              <ChartView chart={song.chart} steps={numbering.steps} playRoot={playRoot} onChange={(chart) => save({ chart })} />
            </div>
          </section>

          {/* The words, fixed the same way as the chart: open, change, then save or cancel. */}
          <section className="panel" aria-label="Words">
            <div className="flex flex-wrap items-center gap-2">
              <span className="label">Words</span>
              <div className="ml-auto flex items-center gap-2">
                {song.sourceUrl ? <GeniusLink url={song.sourceUrl} /> : null}
                {!editingWords && lyrics ? (
                  <button
                    type="button"
                    className="btn btn-quiet"
                    onClick={() => {
                      setDraft(lyrics);
                      setEditingWords(true);
                    }}
                  >
                    <PencilSimple size={ICON.sm} weight="bold" />
                    Edit
                  </button>
                ) : null}
              </div>
            </div>
            {editingWords ? (
              <div className="mt-3 flex flex-col gap-3">
                {/* A fetch fills the draft, so Cancel still puts the old words back. */}
                <LyricsFinder
                  track={song.title}
                  artist={song.credit.trim().toLowerCase() === "traditional" ? "" : song.credit}
                  onPick={setDraft}
                  replacing={Boolean(draft.trim())}
                />
                <textarea
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  rows={14}
                  placeholder="Paste the words here."
                  aria-label="Words"
                  className="w-full rounded-xl border border-line bg-ink p-3 text-[16px] leading-relaxed text-bone outline-none placeholder:text-bone-dim focus-visible:border-bone-dim"
                />
                <div className="flex justify-end gap-2">
                  <button type="button" className="btn btn-quiet" onClick={() => setEditingWords(false)}>
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => {
                      setLyrics(song.slug, draft);
                      setEditingWords(false);
                    }}
                  >
                    Save
                  </button>
                </div>
              </div>
            ) : lyrics ? (
              <pre className="mt-3 whitespace-pre-wrap font-[family-name:var(--font-display)] text-[19px] leading-[1.8] text-bone">
                {lyrics}
              </pre>
            ) : (
              <div className="mt-3 flex flex-col gap-3">
                <p className="text-[14px] text-bone-dim">No words yet.</p>
                <LyricsFinder
                  track={song.title}
                  artist={song.credit.trim().toLowerCase() === "traditional" ? "" : song.credit}
                  onPick={(words) => {
                    setDraft(words);
                    setEditingWords(true);
                  }}
                >
                  <button
                    type="button"
                    className="btn whitespace-nowrap"
                    onClick={() => {
                      setDraft("");
                      setEditingWords(true);
                    }}
                  >
                    Paste them in
                  </button>
                </LyricsFinder>
              </div>
            )}
          </section>

          {/* For learning the song rather than playing it, so they come last and start folded. */}
          {hasChart ? (
            <section aria-label="Learn this song" className="flex flex-col">
              <span className="label mt-2">Learn this song</span>
              <SongShapes chords={chords} playRoot={playRoot} />
              <ChordFamily root={root} tonality={song.tonality} numbering={numbering} used={bars} />
              <div className="mt-4">
                <SongsOnThis bars={song.chart[0]?.bars ?? []} />
              </div>
            </section>
          ) : null}
        </>
      )}
    </main>
  );
}
