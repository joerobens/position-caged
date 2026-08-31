"use client";

import { useMemo } from "react";
import { useSettings } from "@/hooks/useSettings";
import { useTheme } from "@/hooks/useTheme";
import { paletteFor } from "@/lib/theme";
import type { Position, Tonality } from "@/lib/music";
import { gripFor } from "@/lib/grips";

/**
 * One chord, as a grip.
 *
 * The neck view answers where the notes are; this answers where the fingers
 * go, which is the question you have while learning a song rather than while
 * exploring one. It is drawn from the same shape table the fretboard uses, so
 * the two cannot drift apart, and it takes the colour of the CAGED form it
 * belongs to so a chart of them reads as a route up the neck.
 */
const STRINGS = 6;
const FRETS = 4;
const W = 88;
const H = 92;
/*
 * The left margin carries the fret number, and a shape can sit at the twelfth,
 * so it has to hold two digits. It had four pixels, which cut everything past
 * a single digit in half.
 */
const PAD_L = 20;
const PAD_R = 8;
const TOP = 20;
const GAP_X = (W - PAD_L - PAD_R) / (STRINGS - 1);
const GAP_Y = (H - TOP - 10) / FRETS;

export default function ChordBox({
  position,
  tonality = "major",
  quality = "",
  label,
  name,
  onInexact,
}: {
  position: Position;
  /** Which of the two forms this position came from. */
  tonality?: Tonality;
  /** What the chart asked for beyond the triad, e.g. 7 or sus4. */
  quality?: string;
  /** The degree, e.g. 6-. */
  label?: string;
  /** The chord's name in the current key, e.g. Am. */
  name?: string;
  /** Told when the form drawn is the triad rather than the quality asked for. */
  onInexact?: (exact: boolean) => void;
}) {
  const { settings } = useSettings();
  const resolved = useTheme(settings.theme);
  const palette = paletteFor(resolved);
  const colour = palette.shapes[position.name];

  const grip = gripFor(position.name, tonality, quality);
  if (onInexact) onInexact(grip.exact);

  const held = useMemo(() => {
    const frets = grip.frets;
    // Where the window starts. An open shape shows the nut; anything else
    // starts a fret below the lowest stopped note so the hand has context.
    const stopped = frets
      .map((offset, string) => (offset === null ? null : { string, fret: position.fret + offset }))
      .filter((entry): entry is { string: number; fret: number } => entry !== null && entry.fret > 0);
    const lowest = stopped.length ? Math.min(...stopped.map((entry) => entry.fret)) : 1;
    const start = position.fret === 0 ? 0 : Math.max(1, lowest);

    // Which note is the root, so it can be marked.
    const rootFret = position.fret + position.shape.rootOffset;
    return {
      start,
      dots: frets.map((offset: number | null, string: number) => {
        if (offset === null) return { string, kind: "muted" as const };
        const fret = position.fret + offset;
        if (fret === 0) return { string, kind: "open" as const };
        const isRoot = string === position.shape.rootString && fret === rootFret;
        return { string, kind: "held" as const, fret, isRoot };
      }),
      barre: grip.barre && position.fret > 0 ? grip.barre : null,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [position, tonality, quality]);

  // Low E on the left, as a chord diagram is always drawn: you are looking at
  // the front of the neck with the headstock up, so the thickest string is the
  // one nearest your thumb side. The shape table counts strings the other way,
  // low to high, which is why this reads straight across rather than reversed.
  const x = (string: number) => PAD_L + string * GAP_X;
  /*
   * Which fret the first space belongs to.
   *
   * When the shape is played at the nut the top line is the nut itself, so the
   * space under it is the first fret. Everywhere else the top line is the wire
   * above the lowest note, and the space under it is that note's own fret.
   * Treating both the same put every open chord a fret too low.
   */
  const firstFret = held.start === 0 ? 1 : held.start;
  const y = (fret: number) => TOP + (fret - firstFret + 0.5) * GAP_Y;
  const visible = (fret: number) => fret >= firstFret && fret < firstFret + FRETS;

  return (
    <figure className="flex flex-col items-center gap-1">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-[88px]" role="img" aria-label={`${name ?? ""} ${position.name} shape`}>
        {/* the nut, thick, only when the shape is played at it */}
        {held.start === 0 ? (
          <line x1={PAD_L} y1={TOP} x2={W - PAD_R} y2={TOP} stroke={palette.nut} strokeWidth={3} strokeLinecap="round" />
        ) : (
          <text x={PAD_L - 6} y={TOP + GAP_Y * 0.8} textAnchor="end" className="fb-mark" fill={palette.dim} fontSize={10}>
            {held.start}
          </text>
        )}
        {Array.from({ length: FRETS + 1 }, (_, i) => (
          <line
            key={`f${i}`}
            x1={PAD_L}
            y1={TOP + i * GAP_Y}
            x2={W - PAD_R}
            y2={TOP + i * GAP_Y}
            stroke={palette.fret}
            strokeWidth={held.start === 0 && i === 0 ? 0 : 1}
          />
        ))}
        {Array.from({ length: STRINGS }, (_, s) => (
          <line key={`s${s}`} x1={x(s)} y1={TOP} x2={x(s)} y2={TOP + FRETS * GAP_Y} stroke={palette.string} strokeWidth={1} />
        ))}

        {held.barre ? (
          <line
            x1={x(held.barre[1])}
            y1={y(position.fret)}
            x2={x(held.barre[0])}
            y2={y(position.fret)}
            stroke={colour}
            strokeWidth={GAP_Y * 0.62}
            strokeLinecap="round"
          />
        ) : null}

        {held.dots.map((dot) => {
          if (dot.kind === "muted") {
            return (
              <text key={dot.string} x={x(dot.string)} y={TOP - 5} textAnchor="middle" fontSize={9} fill={palette.dim}>
                ×
              </text>
            );
          }
          if (dot.kind === "open") {
            return (
              <circle key={dot.string} cx={x(dot.string)} cy={TOP - 8} r={3} fill="none" stroke={palette.dim} strokeWidth={1.2} />
            );
          }
          if (!visible(dot.fret)) return null;
          return (
            <circle
              key={dot.string}
              cx={x(dot.string)}
              cy={y(dot.fret)}
              r={GAP_Y * 0.3}
              fill={colour}
              stroke={dot.isRoot ? palette.onAccent : "none"}
              strokeWidth={dot.isRoot ? 2.2 : 0}
            />
          );
        })}
      </svg>
      <figcaption className="flex items-baseline gap-1.5 text-center">
        {label ? <span className="font-mono text-[13px] font-medium text-bone">{label}</span> : null}
        {name ? <span className="text-[12px] text-bone-dim">{name}</span> : null}
      </figcaption>
    </figure>
  );
}
