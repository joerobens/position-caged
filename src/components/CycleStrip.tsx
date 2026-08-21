"use client";

import { Fragment } from "react";
import type { Position } from "@/lib/music";
import type { Palette } from "@/lib/theme";

/**
 * The five forms in the order they actually appear going up the neck, which is
 * always the CAGED cycle entered at whichever letter the key starts on. The app
 * has always relied on this; it never said so.
 */
export default function CycleStrip({
  positions,
  current,
  palette,
}: {
  positions: Position[];
  current: string;
  palette: Palette;
}) {
  if (!positions.length) return null;
  const first = positions[0];
  return (
    <p className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[13px] text-bone-dim">
      {positions.map((entry, index) => (
        <Fragment key={entry.name}>
          <span
            className={entry.name === current ? "font-medium" : "opacity-60"}
            style={{ color: palette.shapes[entry.name] }}
          >
            {entry.name}
          </span>
          <span aria-hidden="true" className="opacity-40">
            &rarr;
          </span>
          {index === positions.length - 1 ? (
            <span className="opacity-60" style={{ color: palette.shapes[first.name] }}>
              {first.name}
            </span>
          ) : null}
        </Fragment>
      ))}
      <span className="ml-1">
        again at fret {first.fret + 12}. The five forms always run in that order, and the loop never breaks.
      </span>
    </p>
  );
}
