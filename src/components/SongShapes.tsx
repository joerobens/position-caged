"use client";

import { useState } from "react";
import ChordBox from "@/components/ChordBox";
import { nearestPosition } from "@/lib/progressions";
import { chordName, type ChordToken } from "@/lib/nashville";

/**
 * The song's chords, as grips, and a way to move them.
 *
 * A chart tells you which chords; this tells you where to put your hands, and
 * the region control answers the question that follows: the same four chords
 * played somewhere else. Every chord is fetched to the nearest CAGED form to
 * the fret you pick, so moving the region moves the whole song together and
 * you can see which part of the neck it sits most comfortably in.
 */
const REGIONS = [
  { fret: 0, label: "Nut" },
  { fret: 3, label: "Fret 3" },
  { fret: 5, label: "Fret 5" },
  { fret: 8, label: "Fret 8" },
  { fret: 10, label: "Fret 10" },
];

export default function SongShapes({
  chords,
  playRoot,
}: {
  chords: ChordToken[];
  /** The root the chart's degrees are counted from, behind any capo. */
  playRoot: number;
}) {
  const [anchor, setAnchor] = useState(0);
  if (!chords.length) return null;

  return (
    <section className="panel mt-5" aria-label="Chord shapes">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="label">Where your hands go</span>
        <div className="segmented ml-auto w-fit" role="group" aria-label="Region of the neck">
          {REGIONS.map((region) => (
            <button
              key={region.fret}
              type="button"
              aria-pressed={anchor === region.fret}
              onClick={() => setAnchor(region.fret)}
            >
              {region.label}
            </button>
          ))}
        </div>
      </div>

      <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-4">
        {chords.map((token) => {
          const root = (playRoot + token.offset) % 12;
          // The grip has to match the chord: a minor chord wants a minor form.
          const minor = token.suffix.startsWith("m") && !token.suffix.startsWith("maj");
          const position = nearestPosition(root, minor ? "minor" : "major", anchor);
          return (
            <li key={token.raw}>
              <ChordBox
                position={position}
                label={token.raw}
                name={`${chordName(token, playRoot)}${position.fret === 0 ? "" : ` · ${position.name} shape`}`}
              />
            </li>
          );
        })}
      </ul>

      <p className="mt-3 max-w-[62ch] text-[13px] leading-relaxed text-bone-dim">
        Each chord takes the CAGED form nearest that fret, so the whole song moves together. The ringed dot is the
        root.
      </p>
    </section>
  );
}
