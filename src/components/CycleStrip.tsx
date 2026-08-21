"use client";

import { Fragment } from "react";
import type { Position } from "@/lib/music";

/**
 * The five forms in the order they actually appear going up the neck, which is
 * always the CAGED cycle entered at whichever letter the key starts on. The app
 * has always relied on this; it never said so.
 */
export default function CycleStrip({ positions, current }: { positions: Position[]; current: string }) {
  if (!positions.length) return null;
  const first = positions[0];
  return (
    <p className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[13px] text-bone-dim">
      {positions.map((entry, index) => (
        <Fragment key={entry.name}>
          <span
            className={entry.name === current ? "font-medium" : "opacity-60"}
            style={{ color: entry.shape.colour }}
          >
            {entry.name}
          </span>
          <span aria-hidden="true" className="opacity-40">
            &rarr;
          </span>
          {index === positions.length - 1 ? (
            <span className="opacity-60" style={{ color: first.shape.colour }}>
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
