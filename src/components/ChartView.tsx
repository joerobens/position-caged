"use client";

import { useState } from "react";
import { PencilSimple, Plus } from "@phosphor-icons/react";
import { chordName, parseChord } from "@/lib/nashville";
import { nextSectionName } from "@/lib/chartTemplates";
import type { Tonality } from "@/lib/music";
import type { ChartSection } from "@/lib/songs";
import { ICON } from "@/lib/icons";

const splitBars = (text: string) =>
  text
    .split(/[|\s]+/)
    .map((bar) => bar.trim())
    .filter(Boolean);

/** One bar: the chord you play, large, with the number it is written as above it. */
function Tile({ bar, steps, playRoot }: { bar: string; steps: Tonality; playRoot: number }) {
  const token = parseChord(bar, steps);
  const name = token && !token.hold ? chordName(token, playRoot) : null;
  return (
    <span className="flex min-w-[72px] flex-col items-center rounded-lg border border-line bg-ink px-2 py-1.5">
      <span className="font-mono text-[13px] leading-tight text-bone-dim">{bar}</span>
      <span className="font-mono text-[22px] font-medium leading-tight">{name ?? (token?.hold ? "%" : "?")}</span>
    </span>
  );
}

/**
 * A chart you can read from the stand and fix where it stands.
 *
 * Tapping a line turns just that line into an input, with the chords previewed
 * as you type, and Save or Cancel. A quick correction ("bar 6 is a 3") should
 * never mean opening every field the song has.
 */
export default function ChartView({
  chart,
  steps,
  playRoot,
  onChange,
}: {
  chart: ChartSection[];
  /** How the numbers are counted, so each bar can be named. */
  steps: Tonality;
  /** The key the chords are spelled in, after any capo. */
  playRoot: number;
  /** Given, the chart can be edited in place. */
  onChange?: (chart: ChartSection[]) => void;
}) {
  // Which line is open for editing: an index, or "new" for a section not yet there.
  const [open, setOpen] = useState<number | "new" | null>(null);
  const [name, setName] = useState("");
  const [bars, setBars] = useState("");

  const start = (index: number | "new") => {
    setOpen(index);
    setName(index === "new" ? nextSectionName(chart.length) : chart[index].name);
    setBars(index === "new" ? "" : chart[index].bars.join(" "));
  };
  const draft = splitBars(bars);
  const unknown = draft.filter((bar) => parseChord(bar, steps) === null);

  const save = () => {
    if (!onChange || open === null || unknown.length) return;
    const section = { name: name.trim() || nextSectionName(chart.length), bars: draft };
    const next =
      open === "new"
        ? draft.length
          ? [...chart, section]
          : chart
        : // Emptying a line takes the section out.
          draft.length
          ? chart.map((entry, index) => (index === open ? section : entry))
          : chart.filter((_, index) => index !== open);
    onChange(next);
    setOpen(null);
  };

  const editor = (
    <div className="flex flex-col gap-3 rounded-xl border border-[color:var(--accent)] bg-ink p-3">
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          aria-label="Section name"
          className="min-h-11 w-40 rounded-[10px] border border-line bg-panel px-3 text-sm text-bone outline-none focus-visible:border-bone-dim"
        />
        <span className="text-[13px] text-bone-dim">Numbers 1 to 7, - for minor, % to hold. Empty it to remove the line.</span>
      </div>
      <input
        value={bars}
        autoFocus
        onChange={(event) => setBars(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") save();
          if (event.key === "Escape") setOpen(null);
        }}
        aria-label={`Bars of ${name}`}
        placeholder="1 4 5 1"
        className="min-h-12 w-full rounded-[10px] border border-line bg-panel px-3 font-mono text-[20px] text-bone outline-none placeholder:text-bone-dim focus-visible:border-bone-dim"
      />
      {draft.length ? (
        <div className="flex flex-wrap gap-2">
          {draft.map((bar, index) => (
            <Tile key={index} bar={bar} steps={steps} playRoot={playRoot} />
          ))}
        </div>
      ) : null}
      {unknown.length ? (
        <p role="alert" className="text-[13px] text-bone-dim">
          Cannot read <b className="font-medium text-bone">{unknown.join(", ")}</b>. Every bar starts with a number from 1
          to 7.
        </p>
      ) : null}
      <div className="flex justify-end gap-2">
        <button type="button" className="btn btn-quiet" onClick={() => setOpen(null)}>
          Cancel
        </button>
        <button type="button" className="btn btn-primary" disabled={unknown.length > 0} onClick={save}>
          Save
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col">
      {chart.map((section, index) =>
        open === index ? (
          <div key={index} className="py-2">
            {editor}
          </div>
        ) : (
          <button
            key={index}
            type="button"
            disabled={!onChange}
            onClick={() => start(index)}
            aria-label={onChange ? `Fix the ${section.name} line` : undefined}
            className="grid grid-cols-[88px_1fr_auto] items-center gap-3 border-b border-line py-2.5 text-left last:border-b-0 enabled:hover:bg-board/40 disabled:cursor-default"
          >
            <span className="label">{section.name}</span>
            <span className="flex flex-wrap gap-2">
              {section.bars.map((bar, bar_) => (
                <Tile key={bar_} bar={bar} steps={steps} playRoot={playRoot} />
              ))}
            </span>
            {onChange ? <PencilSimple size={ICON.sm} weight="bold" className="text-bone-dim" /> : <span />}
          </button>
        ),
      )}
      {onChange ? (
        open === "new" ? (
          <div className="py-2">{editor}</div>
        ) : (
          <button type="button" className="btn btn-quiet mt-2 self-start" onClick={() => start("new")}>
            <Plus size={ICON.sm} weight="bold" />
            Add a section
          </button>
        )
      ) : null}
    </div>
  );
}
