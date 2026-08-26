"use client";

import { useState } from "react";
import ChordBox from "@/components/ChordBox";
import Panel from "@/components/Panel";
import { nearestPosition } from "@/lib/progressions";
import { buildPositions } from "@/lib/music";
import { shapesWith } from "@/lib/grips";
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
    <Panel
      id="shapes"
      label="Where your hands go"
      aside={
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
      }
    >
      <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-4">
        {chords.map((token) => {
          const root = (playRoot + token.offset) % 12;
          // The grip has to match the chord: a minor chord wants a minor form.
          const minor = token.suffix.startsWith("m") && !token.suffix.startsWith("maj");
          const tonality = minor ? "minor" : "major";

          // Prefer a shape that can actually draw what the chart asked for.
          // A seventh drawn as a plain triad is a diagram contradicting the
          // chart above it, so a form that has the note wins over a nearer one
          // that does not.
          const able = shapesWith(token.suffix);
          const position = able.length
            ? buildPositions(root, tonality)
                .filter((entry) => able.includes(entry.name))
                .sort(
                  (a, b) =>
                    Math.min(Math.abs(a.fret - anchor), Math.abs(a.fret + 12 - anchor)) -
                    Math.min(Math.abs(b.fret - anchor), Math.abs(b.fret + 12 - anchor)),
                )[0] ?? nearestPosition(root, tonality, anchor)
            : nearestPosition(root, tonality, anchor);

          return (
            <li key={token.raw}>
              <ChordBox
                position={position}
                tonality={tonality}
                quality={token.suffix}
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
    </Panel>
  );
}
