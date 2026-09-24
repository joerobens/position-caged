"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CaretDown } from "@phosphor-icons/react";
import GeniusSearch from "@/components/GeniusSearch";
import LyricsFinder from "@/components/LyricsFinder";
import ChartFinder, { type FoundChart } from "@/components/ChartFinder";
import ChartTemplates from "@/components/ChartTemplates";
import ChartView from "@/components/ChartView";
import Popover from "@/components/Popover";
import { Segmented } from "@/components/controls";
import { useLibrary } from "@/hooks/useLibrary";
import { addSong, setLyrics, slugify } from "@/lib/songStore";
import { nextSectionName } from "@/lib/chartTemplates";
import { KEYS, type Tonality } from "@/lib/music";
import { numberingOf, shapeRoot } from "@/lib/nashville";
import { TUNINGS, effectiveCapo } from "@/lib/tunings";
import type { ChartSection } from "@/lib/songs";
import { ICON } from "@/lib/icons";

const field =
  "min-h-11 rounded-[10px] border border-line bg-ink px-3 text-[15px] text-bone outline-none placeholder:text-bone-dim focus-visible:border-bone-dim";

/** One line of what the lookup found, or did not, with a way to deal with it. */
function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 items-start gap-2 border-t border-line py-3 first:border-t-0 sm:grid-cols-[110px_1fr]">
      <span className="pt-2.5 text-[14px] text-bone-dim">{label}</span>
      <div className="flex min-w-0 flex-col gap-2">{children}</div>
    </div>
  );
}

/**
 * Adding a song: find it, confirm what came back, done.
 *
 * Picking a song from the search fills in the title and artwork, then looks for
 * the words and the chart on its own. What it found is laid out in one card, the
 * chart as the song page will show it, and anything can be fixed before saving.
 * Nothing is invented: with no chart found, the chart is empty rather than a
 * made-up one in C, and a song can be saved with a title alone.
 */
export default function NewSong() {
  const library = useLibrary();
  const router = useRouter();
  const [chosen, setChosen] = useState("");
  const [byHand, setByHand] = useState(false);
  const [title, setTitle] = useState("");
  const [credit, setCredit] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [art, setArt] = useState("");
  const [root, setRoot] = useState(0);
  const [tonality, setTonality] = useState<Tonality>("major");
  const [numbering, setNumbering] = useState<"relative-major" | "tonic">("relative-major");
  const [capo, setCapo] = useState(0);
  const [tuning, setTuning] = useState("standard");
  const [feel, setFeel] = useState("");
  const [bpm, setBpm] = useState("");
  const [chart, setChart] = useState<ChartSection[]>([]);
  const [words, setWords] = useState("");
  const [editingWords, setEditingWords] = useState(false);
  // A found chart that would replace one you have already started.
  const [proposal, setProposal] = useState<FoundChart | null>(null);
  const chartNow = useRef(chart);
  useEffect(() => {
    chartNow.current = chart;
  }, [chart]);

  const takeChart = (found: FoundChart) => {
    setRoot(found.root);
    setTonality(found.tonality);
    setNumbering(found.numbering);
    setCapo(found.capo);
    if (found.tuning) setTuning(found.tuning);
    setChart(found.chart);
  };

  const started = Boolean(chosen) || byHand;
  const counting = numberingOf({ root, tonality, numbering });
  const held = effectiveCapo(capo, tuning);
  const playRoot = shapeRoot(counting.root, held);
  const artist = credit.trim().toLowerCase() === "traditional" ? "" : credit;

  const save = () => {
    if (!title.trim()) return;
    const slug = slugify(title, library);
    addSong({
      slug,
      title: title.trim(),
      credit: credit.trim(),
      root,
      tonality,
      numbering,
      capo: capo || undefined,
      tuning: tuning === "standard" ? undefined : tuning,
      feel: feel.trim() || undefined,
      bpm: bpm ? Number(bpm) : undefined,
      chart,
      sourceUrl: sourceUrl || undefined,
      art: art || undefined,
    });
    if (words.trim()) setLyrics(slug, words);
    router.push(`/songs/${slug}`);
  };

  return (
    <main className="mx-auto flex w-full max-w-[980px] flex-col gap-4 px-[var(--gutter)] py-7 pb-16">
      <Link href="/songs" className="-my-2 inline-flex min-h-11 items-center self-start text-[13px] text-bone-dim hover:text-bone">
        &larr; Songs
      </Link>
      <h1 className="text-[24px] font-medium tracking-tight">Add a song</h1>

      <GeniusSearch
        onArtwork={setArt}
        onPick={(hit) => {
          setTitle(hit.title);
          setCredit(hit.artist);
          setSourceUrl(hit.url);
          setArt(hit.art ?? "");
          setChosen(`${hit.title}|${hit.artist}`);
        }}
      />
      {started ? null : (
        <button type="button" className="btn btn-quiet self-start" onClick={() => setByHand(true)}>
          Type one in by hand instead
        </button>
      )}

      {started ? (
        <>
          <section className="panel" aria-label="What we have">
            <Row label="Song">
              <div className="flex flex-wrap gap-2">
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Title"
                  aria-label="Title"
                  autoFocus={byHand && !chosen}
                  className={`${field} min-w-[200px] flex-1`}
                />
                <input
                  value={credit}
                  onChange={(event) => setCredit(event.target.value)}
                  placeholder="Artist, or where you learned it"
                  aria-label="Artist"
                  className={`${field} min-w-[200px] flex-1`}
                />
              </div>
            </Row>

            <Row label="Words">
              <LyricsFinder track={title} artist={artist} onPick={setWords} auto={chosen} replacing={Boolean(words.trim())}>
                {words || editingWords ? null : (
                  <button type="button" className="btn whitespace-nowrap" onClick={() => setEditingWords(true)}>
                    Paste them in
                  </button>
                )}
              </LyricsFinder>
              {words.trim() ? (
                <div className="flex flex-wrap items-center gap-2 text-[14px]">
                  <button type="button" className="btn btn-quiet" onClick={() => setEditingWords((open) => !open)}>
                    {editingWords ? "Hide the words" : "See the words"}
                  </button>
                </div>
              ) : null}
              {editingWords ? (
                <textarea
                  value={words}
                  onChange={(event) => setWords(event.target.value)}
                  rows={10}
                  placeholder="Paste the words here."
                  aria-label="Words"
                  className="w-full rounded-xl border border-line bg-ink p-3 text-[15px] leading-relaxed text-bone outline-none placeholder:text-bone-dim focus-visible:border-bone-dim"
                />
              ) : null}
            </Row>

            <Row label="Chart">
              <ChartFinder
                track={title}
                artist={artist}
                auto={chosen}
                onFound={(found) => (chartNow.current.length ? setProposal(found) : takeChart(found))}
              />
              {proposal ? (
                <div role="status" className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-ink px-3 py-2.5 text-[14px]">
                  <span className="text-bone-dim">
                    Found a chart:{" "}
                    <b className="font-medium text-bone">
                      {KEYS[proposal.root]} {proposal.tonality}
                      {proposal.capo ? `, capo ${proposal.capo}` : ""}, {proposal.chart.length} section
                      {proposal.chart.length === 1 ? "" : "s"}
                    </b>
                    . Using it replaces what you have started.
                  </span>
                  <span className="ml-auto flex gap-2">
                    <button type="button" className="btn btn-quiet" onClick={() => setProposal(null)}>
                      Keep mine
                    </button>
                    <button
                      type="button"
                      className="btn"
                      onClick={() => {
                        takeChart(proposal);
                        setProposal(null);
                      }}
                    >
                      Use it
                    </button>
                  </span>
                </div>
              ) : null}
            </Row>

            {/* The key as your hands need it: what it sounds in, where the capo goes, what you hold. */}
            <Row label="Key">
              <div className="flex flex-wrap items-center gap-2">
                <Popover
                  label={`Sounds in ${KEYS[root]} ${tonality}. Change it`}
                  button={(open) => (
                    <>
                      <span className="text-[13px] text-bone-dim">Sounds in</span>
                      <b className="text-[16px] font-medium">
                        {KEYS[root]} {tonality}
                      </b>
                      <CaretDown size={ICON.sm} weight="bold" style={{ transform: open ? "rotate(180deg)" : undefined }} />
                    </>
                  )}
                >
                  {(close) => (
                    <>
                      <Segmented
                        ariaLabel="Major or minor"
                        value={tonality}
                        onChange={setTonality}
                        options={[
                          { value: "major", label: "Major" },
                          { value: "minor", label: "Minor" },
                        ]}
                      />
                      <div role="group" aria-label="Sounds in" className="grid grid-cols-6 gap-1.5">
                        {KEYS.map((name, index) => (
                          <button
                            key={name}
                            type="button"
                            className="chip px-0"
                            aria-pressed={index === root}
                            onClick={() => {
                              setRoot(index);
                              close();
                            }}
                          >
                            {name}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </Popover>
                <label className="flex items-center gap-2 text-[14px] text-bone-dim">
                  Capo
                  <select
                    value={capo}
                    onChange={(event) => setCapo(Number(event.target.value))}
                    aria-label="Capo"
                    className={field}
                  >
                    {Array.from({ length: 10 }, (_, fret) => (
                      <option key={fret} value={fret}>
                        {fret === 0 ? "none" : fret}
                      </option>
                    ))}
                  </select>
                </label>
                {held ? (
                  <span className="text-[14px] text-bone-dim">
                    You hold{" "}
                    <b className="font-medium text-bone">
                      {KEYS[shapeRoot(root, held)]}
                      {tonality === "minor" ? "m" : ""} shapes
                    </b>
                  </span>
                ) : null}
              </div>
              <details className="text-[14px] text-bone-dim">
                <summary className="flex min-h-11 cursor-pointer items-center">Tuning, tempo and feel</summary>
                <div className="flex flex-wrap gap-2 pt-1">
                  <select value={tuning} onChange={(event) => setTuning(event.target.value)} aria-label="Tuning" className={field}>
                    {TUNINGS.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.name}
                        {option.id === "standard" ? "" : ` (${option.label})`}
                      </option>
                    ))}
                  </select>
                  <input
                    value={bpm}
                    inputMode="numeric"
                    onChange={(event) => setBpm(event.target.value.replace(/\D/g, ""))}
                    placeholder="BPM"
                    aria-label="BPM"
                    className={`${field} w-24`}
                  />
                  <input
                    value={feel}
                    onChange={(event) => setFeel(event.target.value)}
                    placeholder="Feel: shuffle, straight, 3/4"
                    aria-label="Feel"
                    className={`${field} min-w-[200px] flex-1`}
                  />
                  {tonality === "minor" ? (
                    <Segmented
                      ariaLabel="Numbering"
                      value={numbering}
                      onChange={setNumbering}
                      options={[
                        { value: "relative-major", label: "Numbers from the relative major" },
                        { value: "tonic", label: "From the tonic" },
                      ]}
                    />
                  ) : null}
                </div>
              </details>
            </Row>
          </section>

          {/* The chart as the song page will show it, fixable line by line before it is saved. */}
          <section className="panel" aria-label="Chart preview">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="label">Chart</span>
              {chart.length ? <span className="text-[13px] text-bone-dim">Tap a line to fix it</span> : null}
            </div>
            {chart.length ? null : (
              <div className="mt-3 flex flex-col gap-3">
                <p className="text-[14px] text-bone-dim">
                  No chart yet. Start from a common progression, add a line, or save without one.
                </p>
                <ChartTemplates
                  steps={counting.steps}
                  relative={counting.relative}
                  tonality={tonality}
                  onPick={(line) =>
                    setChart((current) => [
                      ...current,
                      { name: nextSectionName(current.length), bars: line.split(/[|\s]+/).filter(Boolean) },
                    ])
                  }
                />
              </div>
            )}
            <div className="mt-2">
              <ChartView chart={chart} steps={counting.steps} playRoot={playRoot} onChange={setChart} />
            </div>
          </section>

          <div className="flex flex-wrap items-center gap-3">
            <button type="button" className="btn btn-primary" disabled={!title.trim()} onClick={save}>
              Save the song
            </button>
            {title.trim() ? null : <span className="text-[14px] text-bone-dim">Needs a title</span>}
          </div>
        </>
      ) : null}
    </main>
  );
}
