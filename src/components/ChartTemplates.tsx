"use client";

import { useState } from "react";
import type { Tonality } from "@/lib/music";
import { TEMPLATES, templateBars } from "@/lib/chartTemplates";

/**
 * Start a chart from a shape you already know.
 *
 * Kept behind a toggle because the form is long enough, and because this is a
 * shortcut rather than a step. The bars are rendered in the numbering the song
 * is actually using, so what you see here is what lands in the chart.
 */
export default function ChartTemplates({
  steps,
  relative,
  tonality,
  onPick,
}: {
  steps: Tonality;
  relative: boolean;
  tonality: Tonality;
  onPick: (bars: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const shown = TEMPLATES.filter((template) => template.tonality === tonality);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className="chip chip-sm" aria-expanded={open} onClick={() => setOpen(!open)}>
          {open ? "Close" : "Start from a shape"}
        </button>
        {!open ? (
          <span className="text-[13px] text-bone-dim">
            {shown.length} common {tonality} progressions.
          </span>
        ) : null}
      </div>

      {open ? (
        <ul className="rounded-xl border border-line">
          {shown.map((template) => {
            const bars = templateBars(template, steps, relative);
            return (
              <li key={template.name} className="border-b border-line last:border-b-0">
                <button
                  type="button"
                  onClick={() => {
                    onPick(bars);
                    setOpen(false);
                  }}
                  className="flex min-h-11 w-full flex-col gap-1 px-3 py-3 text-left transition-opacity hover:opacity-70 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-bone active:scale-[0.995]"
                >
                  <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className="text-[14px] font-medium text-bone">{template.name}</span>
                    <span className="font-mono text-[13px]" style={{ color: "var(--accent)" }}>
                      {bars}
                    </span>
                  </span>
                  <span className="text-[12.5px] leading-relaxed text-bone-dim">{template.note}</span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
