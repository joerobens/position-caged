"use client";

import { useState } from "react";
import GeniusSearch from "@/components/GeniusSearch";
import { TUNINGS, effectiveCapo, needsRetune, tuningOf } from "@/lib/tunings";
import { KEYS, type Tonality } from "@/lib/music";
import { chartToText, textToChart } from "@/lib/chartText";
import { chordName, numberingOf, parseChord, shapeRoot } from "@/lib/nashville";
import type { Song } from "@/lib/songs";

/** Create and edit are the same form, so a chart cannot be writable once and never again. */
export default function SongForm({
  initial,
  submitLabel,
  onSave,
  onCancel,
}: {
  initial?: Song;
  submitLabel: string;
  onSave: (song: Omit<Song, "slug">) => void;
  onCancel?: () => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [credit, setCredit] = useState(initial?.credit ?? "");
  const [root, setRoot] = useState(initial?.root ?? 0);
  const [tonality, setTonality] = useState<Tonality>(initial?.tonality ?? "major");
  const [numbering, setNumbering] = useState<"relative-major" | "tonic">(initial?.numbering ?? "relative-major");
  const [capo, setCapo] = useState(initial?.capo ? String(initial.capo) : "");
  const [tuning, setTuning] = useState(initial?.tuning ?? "standard");
  const [feel, setFeel] = useState(initial?.feel ?? "");
  const [bpm, setBpm] = useState(initial?.bpm ? String(initial.bpm) : "");
  const [text, setText] = useState(initial ? chartToText(initial.chart) : "Verse: 1 1 4 1 | 1 5 1 1");
  const [sourceUrl, setSourceUrl] = useState(initial?.sourceUrl ?? "");

  const chart = textToChart(text);
  const counting = numberingOf({ root, tonality, numbering });
  const capoFret = capo ? Number(capo) : 0;
  const tune = tuningOf(tuning);
  // Capo and a uniform retuning pull in opposite directions on the same axis.
  const held = effectiveCapo(capoFret, tuning);
  const playRoot = shapeRoot(counting.root, held);
  const why = [capoFret ? `a capo at ${capoFret}` : null, tune.shift ? `tuned ${tune.name.toLowerCase()}` : null]
    .filter(Boolean)
    .join(" and ");
  const tokens = chart.flatMap((section) => section.bars);
  const unknown = tokens.filter((bar) => parseChord(bar, counting.steps) === null);
  const ready = Boolean(title.trim()) && chart.length > 0 && unknown.length === 0;

  const save = () => {
    if (!ready) return;
    onSave({
      title: title.trim(),
      credit: credit.trim() || "yours",
      root,
      tonality,
      numbering: tonality === "minor" ? numbering : undefined,
      capo: capo ? Number(capo) : undefined,
      tuning: tuning === "standard" ? undefined : tuning,
      feel: feel.trim() || undefined,
      bpm: bpm ? Number(bpm) : undefined,
      chart,
      sourceUrl: sourceUrl || undefined,
      note: initial?.note,
    });
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Look it up, or just type it in. Either way the chart is yours to write. */}
      <GeniusSearch
        caption={initial ? "Find the song, to fill in title, artist and link" : "Find the song"}
        onPick={(hit) => {
          setTitle(hit.title);
          setCredit(hit.artist);
          setSourceUrl(hit.url);
        }}
      />
    <div className="panel flex flex-col gap-4">
      <div className="flex flex-wrap gap-4">
        <label className="flex min-w-[200px] flex-1 flex-col gap-2">
          <span className="label">Title</span>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="min-h-11 rounded-[10px] border border-line bg-ink px-3 text-sm text-bone outline-none focus-visible:border-bone-dim"
          />
        </label>
        <label className="flex min-w-[200px] flex-1 flex-col gap-2">
          <span className="label">Credit</span>
          <input
            value={credit}
            onChange={(event) => setCredit(event.target.value)}
            placeholder="who wrote it, or where you got it"
            className="min-h-11 rounded-[10px] border border-line bg-ink px-3 text-sm text-bone outline-none placeholder:text-bone-dim focus-visible:border-bone-dim"
          />
        </label>
      </div>

      <div className="flex flex-col gap-2">
        <span className="label">Key</span>
        <div className="chip-row">
          {KEYS.map((name, index) => (
            <button key={name} type="button" className="chip" aria-pressed={index === root} onClick={() => setRoot(index)}>
              {name}
            </button>
          ))}
        </div>
        {held ? (
          <p className="text-[13px] leading-relaxed text-bone-dim">
            With {why} you will be holding{" "}
            <b className="font-medium text-bone">{KEYS[shapeRoot(root, held)]}</b> shapes. Put the key the song
            sounds in here and the chart works out the rest.
          </p>
        ) : needsRetune(tuning) ? (
          <p className="text-[13px] leading-relaxed text-bone-dim">
            {tune.name} moves the strings by different amounts, so the shapes are yours to find. The numbers on the
            chart do not change — they never depend on the tuning.
          </p>
        ) : null}
        <div className="flex flex-wrap items-center gap-3">
          <div className="segmented w-fit">
            {(["major", "minor"] as const).map((value) => (
              <button key={value} type="button" aria-pressed={tonality === value} onClick={() => setTonality(value)}>
                {value}
              </button>
            ))}
          </div>
          {tonality === "minor" ? (
            <div className="segmented w-fit">
              <button type="button" aria-pressed={numbering === "relative-major"} onClick={() => setNumbering("relative-major")}>
                Number from relative major
              </button>
              <button type="button" aria-pressed={numbering === "tonic"} onClick={() => setNumbering("tonic")}>
                From the tonic
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap gap-4">
        <label className="flex w-24 flex-col gap-2">
          <span className="label">Capo</span>
          <input
            value={capo}
            inputMode="numeric"
            onChange={(event) => setCapo(event.target.value.replace(/\D/g, ""))}
            className="min-h-11 rounded-[10px] border border-line bg-ink px-3 text-sm text-bone outline-none focus-visible:border-bone-dim"
          />
        </label>
        <label className="flex min-w-[190px] flex-col gap-2">
          <span className="label">Tuning</span>
          <select
            value={tuning}
            onChange={(event) => setTuning(event.target.value)}
            className="min-h-11 rounded-[10px] border border-line bg-ink px-3 text-sm text-bone outline-none focus-visible:border-bone-dim"
          >
            {TUNINGS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
                {option.id === "standard" ? "" : ` — ${option.label}`}
              </option>
            ))}
          </select>
        </label>
        <label className="flex w-24 flex-col gap-2">
          <span className="label">Bpm</span>
          <input
            value={bpm}
            inputMode="numeric"
            onChange={(event) => setBpm(event.target.value.replace(/\D/g, ""))}
            className="min-h-11 rounded-[10px] border border-line bg-ink px-3 text-sm text-bone outline-none focus-visible:border-bone-dim"
          />
        </label>
        <label className="flex min-w-[180px] flex-1 flex-col gap-2">
          <span className="label">Feel</span>
          <input
            value={feel}
            onChange={(event) => setFeel(event.target.value)}
            placeholder="shuffle, straight, 3/4"
            className="min-h-11 rounded-[10px] border border-line bg-ink px-3 text-sm text-bone outline-none placeholder:text-bone-dim focus-visible:border-bone-dim"
          />
        </label>
      </div>

      <label className="flex flex-col gap-2">
        <span className="label">Chart</span>
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          rows={Math.max(3, text.split("\n").length + 1)}
          className="rounded-xl border border-line bg-ink p-3 font-mono text-sm leading-relaxed text-bone outline-none focus-visible:border-bone-dim"
        />
        <span className="text-[13px] leading-relaxed text-bone-dim">
          One section per line, named before a colon. Bar lines are ignored, so lay it out however reads best. Use{" "}
          <b className="font-medium text-bone">-</b> for minor, <b className="font-medium text-bone">b</b> or{" "}
          <b className="font-medium text-bone">#</b> to shift a degree, a slash for an inversion, and{" "}
          <b className="font-medium text-bone">%</b> to hold.
        </span>
      </label>

      <div className="rounded-xl border border-line bg-ink p-3">
        <span className="label">
          {capoFret
            ? `Behind the capo you play`
            : `In ${KEYS[counting.root]} that reads${counting.relative ? ", counted from the relative major" : ""}`}
        </span>
        {chart.map((section, index) => (
          <p key={index} className="mt-2 font-mono text-[14px] leading-relaxed">
            <span className="text-bone-dim">{section.name}: </span>
            <span style={{ color: unknown.length ? "var(--color-bone-dim)" : "var(--accent)" }}>
              {section.bars
                .map((bar) => {
                  const token = parseChord(bar, counting.steps);
                  return token && !token.hold ? chordName(token, playRoot) : bar;
                })
                .join("  ")}
            </span>
          </p>
        ))}
        {!chart.length ? <p className="mt-2 text-[13px] text-bone-dim">Nothing yet.</p> : null}
        {unknown.length ? (
          <p className="mt-2 text-[13px] leading-relaxed text-bone-dim">
            Cannot read <b className="font-medium text-bone">{unknown.join(", ")}</b>. Every bar starts with a number
            from 1 to 7.
          </p>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="chip"
          disabled={!ready}
          style={{
            background: "var(--accent)",
            borderColor: "var(--accent)",
            color: "var(--on-accent)",
            fontWeight: 500,
            opacity: ready ? 1 : 0.4,
          }}
          onClick={save}
        >
          {submitLabel}
        </button>
        {onCancel ? (
          <button type="button" className="chip" onClick={onCancel}>
            Cancel
          </button>
        ) : null}
        {sourceUrl ? (
          <span className="self-center text-[13px] text-bone-dim">Linked to its Genius page.</span>
        ) : null}
      </div>
    </div>
    </div>
  );
}
