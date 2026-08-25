"use client";

import { chordAt, type Progression } from "@/lib/progressions";

/**
 * The form drawn as a chart, the way it is written on paper: four bars to a line
 * for a twelve bar blues. The bar you are on is filled, so you can see where you
 * are in the form without counting.
 */
export default function BarStrip({
  progression,
  keyRoot,
  bar,
  onSelect,
}: {
  progression: Progression;
  keyRoot: number;
  bar: number;
  onSelect?: (bar: number) => void;
}) {
  const current = ((bar % progression.bars.length) + progression.bars.length) % progression.bars.length;
  return (
    <div
      className="grid gap-1.5"
      style={{ gridTemplateColumns: `repeat(${progression.perLine}, minmax(0, 1fr))` }}
      role="group"
      aria-label="Bars of the form"
    >
      {progression.bars.map((_, index) => {
        const chord = chordAt(progression, keyRoot, index);
        const active = index === current;
        return (
          <button
            key={index}
            type="button"
            disabled={!onSelect}
            aria-current={active ? "true" : undefined}
            aria-label={`Bar ${index + 1}, ${chord.name}, the ${chord.roman} chord`}
            onClick={onSelect ? () => onSelect(index) : undefined}
            className="flex min-h-11 flex-col items-center justify-center rounded-lg border px-1 py-1.5 transition-colors disabled:cursor-default"
            style={{
              borderColor: active ? "var(--accent)" : "var(--color-line)",
              background: active ? "var(--accent)" : "transparent",
              // The background is the CSS accent, which does not flip, so the
              // label must come from the token that matches it.
              color: active ? "var(--on-accent)" : "var(--color-bone)",
            }}
          >
            <span className="text-sm font-medium leading-none">{chord.name}</span>
            <span className="mt-0.5 font-mono text-[10px] leading-none opacity-70">{chord.roman}</span>
          </button>
        );
      })}
    </div>
  );
}
