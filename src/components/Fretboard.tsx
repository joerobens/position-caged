"use client";

import { memo, useMemo } from "react";
import {
  DEGREES,
  FRET_COUNT,
  STRING_LABELS,
  chordToneKeys,
  degreeAt,
  noteNameAt,
  type Position,
} from "@/lib/music";
import type { Labels, Zoom } from "@/lib/settings";

/** Neck geometry, in SVG user units. */
const NUT_X = 64;
const FRET_WIDTH = 44;
const TOP_Y = 46;
const STRING_GAP = 30;
const BOARD_WIDTH = NUT_X + FRET_COUNT * FRET_WIDTH + 22;
const BOARD_HEIGHT = TOP_Y + 5 * STRING_GAP + 48;
const INLAYS = [3, 5, 7, 9, 15];

/** Open-string MIDI numbers, low E to high e. */
const STRING_MIDI = [40, 45, 50, 55, 59, 64];

const fretX = (fret: number) => (fret === 0 ? NUT_X - 22 : NUT_X + (fret - 0.5) * FRET_WIDTH);
const stringY = (string: number) => TOP_Y + (5 - string) * STRING_GAP;

type Props = {
  position: Position;
  /** The other shape in a slide drill, drawn as a ghost box. */
  pair?: Position | null;
  root: number;
  intervals: number[];
  zoom: Zoom;
  labels: Labels;
  onPlayNote?: (midi: number) => void;
};

type Window = { low: number; high: number };

const windowFor = (position: Position): Window => ({
  low: Math.max(0, position.fret - 1),
  high: Math.min(FRET_COUNT, position.fret + 4),
});

function Fretboard({ position, pair, root, intervals, zoom, labels, onPlayNote }: Props) {
  const view = useMemo(() => {
    const primary = windowFor(position);
    const secondary = pair ? windowFor(pair) : null;
    const span = secondary
      ? { low: Math.min(primary.low, secondary.low), high: Math.max(primary.high, secondary.high) }
      : primary;

    const left = span.low === 0 ? NUT_X - 34 : NUT_X + (span.low - 1) * FRET_WIDTH;
    const right = NUT_X + span.high * FRET_WIDTH;
    const gutter = span.low === 0 ? -28 : left - 34;
    const box = zoom === "position" ? [gutter, 0, right - gutter + 16, BOARD_HEIGHT] : [0, 0, BOARD_WIDTH, BOARD_HEIGHT];
    return { primary, secondary, left, right, labelX: zoom === "position" ? gutter + 14 : 14, box };
  }, [position, pair, zoom]);

  const colour = position.shape.colour;
  const chordTones = useMemo(() => chordToneKeys(position), [position]);
  const visibleFrets = useMemo(() => {
    const frets: number[] = [];
    for (let f = 0; f <= FRET_COUNT; f++) {
      if (zoom === "position" && (f < view.primary.low - 1 || f > view.primary.high + 1)) {
        if (!view.secondary || f < view.secondary.low - 1 || f > view.secondary.high + 1) continue;
      }
      frets.push(f);
    }
    return frets;
  }, [zoom, view]);

  const notes = useMemo(() => {
    const out: {
      key: string;
      string: number;
      fret: number;
      x: number;
      y: number;
      text: string;
      kind: "root" | "chord" | "scale";
      ghost: boolean;
      midi: number;
    }[] = [];
    const inWindow = (w: Window, fret: number) => fret >= w.low && fret <= w.high;
    for (let string = 0; string < 6; string++) {
      for (let fret = 0; fret <= FRET_COUNT; fret++) {
        const primary = inWindow(view.primary, fret);
        const secondary = view.secondary ? inWindow(view.secondary, fret) : false;
        if (!primary && !secondary) continue;
        const degree = degreeAt(string, fret, root);
        const isChordTone = primary && chordTones.has(`${string}:${fret}`);
        if (!intervals.includes(degree) && !isChordTone) continue;
        out.push({
          key: `${string}:${fret}`,
          string,
          fret,
          x: fretX(fret),
          y: stringY(string),
          text: labels === "degrees" ? DEGREES[degree] : noteNameAt(string, fret),
          kind: degree === 0 ? "root" : isChordTone ? "chord" : "scale",
          ghost: !primary,
          midi: STRING_MIDI[string] + fret,
        });
      }
    }
    return out;
  }, [view, root, intervals, chordTones, labels]);

  const barre = position.shape.barre;

  return (
    <svg
      className="block h-auto w-full"
      viewBox={view.box.join(" ")}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={`Guitar neck showing the ${position.name} shape at fret ${position.fret}`}
    >
      {/* position shading */}
      {view.secondary && pair ? (
        <rect
          x={view.secondary.low === 0 ? NUT_X - 34 : NUT_X + (view.secondary.low - 1) * FRET_WIDTH}
          y={TOP_Y - 11}
          width={NUT_X + view.secondary.high * FRET_WIDTH - (view.secondary.low === 0 ? NUT_X - 34 : NUT_X + (view.secondary.low - 1) * FRET_WIDTH)}
          height={5 * STRING_GAP + 22}
          rx={10}
          fill={pair.shape.colour}
          opacity={0.05}
          stroke={pair.shape.colour}
          strokeOpacity={0.25}
          strokeDasharray="4 5"
        />
      ) : null}
      <rect
        x={view.primary.low === 0 ? NUT_X - 34 : NUT_X + (view.primary.low - 1) * FRET_WIDTH}
        y={TOP_Y - 11}
        width={NUT_X + view.primary.high * FRET_WIDTH - (view.primary.low === 0 ? NUT_X - 34 : NUT_X + (view.primary.low - 1) * FRET_WIDTH)}
        height={5 * STRING_GAP + 22}
        rx={10}
        fill={colour}
        opacity={zoom === "position" ? 0.06 : 0.09}
      />

      {/* frets */}
      {Array.from({ length: FRET_COUNT + 1 }, (_, fret) => (
        <line
          key={`fret-${fret}`}
          x1={NUT_X + fret * FRET_WIDTH}
          y1={TOP_Y}
          x2={NUT_X + fret * FRET_WIDTH}
          y2={TOP_Y + 5 * STRING_GAP}
          stroke={fret === 0 ? "#E4DCCB" : "#4A3F37"}
          strokeWidth={fret === 0 ? 5 : 1.5}
          strokeLinecap="round"
        />
      ))}

      {/* strings, thicker toward the low E */}
      {STRING_LABELS.map((_, string) => (
        <line
          key={`string-${string}`}
          x1={NUT_X}
          y1={stringY(string)}
          x2={NUT_X + FRET_COUNT * FRET_WIDTH}
          y2={stringY(string)}
          stroke="#5C5044"
          strokeWidth={1.6 - string * 0.14}
        />
      ))}

      {/* inlays */}
      {INLAYS.filter((f) => f <= FRET_COUNT).map((fret) => (
        <circle key={`inlay-${fret}`} cx={NUT_X + (fret - 0.5) * FRET_WIDTH} cy={TOP_Y + 2.5 * STRING_GAP} r={4.5} fill="#3E342C" />
      ))}
      <circle cx={NUT_X + 11.5 * FRET_WIDTH} cy={TOP_Y + 1.5 * STRING_GAP} r={4.5} fill="#3E342C" />
      <circle cx={NUT_X + 11.5 * FRET_WIDTH} cy={TOP_Y + 3.5 * STRING_GAP} r={4.5} fill="#3E342C" />

      {/* fret numbers and string names */}
      {visibleFrets.map((fret) => (
        <text key={`num-${fret}`} className="fb-mark" x={fretX(fret)} y={TOP_Y + 5 * STRING_GAP + 26} textAnchor="middle">
          {fret}
        </text>
      ))}
      {STRING_LABELS.map((name, string) => (
        <text key={`label-${string}`} className="fb-mark" x={view.labelX} y={stringY(string) + 4} textAnchor="middle">
          {name}
        </text>
      ))}

      {/* muted strings, for shapes played from the nut */}
      {position.fret === 0
        ? position.shape.frets.map((offset, string) =>
            offset === null ? (
              <text key={`mute-${string}`} className="fb-mark" x={NUT_X - 20} y={stringY(string) + 4} textAnchor="middle">
                ×
              </text>
            ) : null,
          )
        : null}

      {/* barre */}
      {barre && position.fret > 0 ? (
        <rect
          x={fretX(position.fret) - 9}
          y={stringY(barre[1]) - 9}
          width={18}
          height={stringY(barre[0]) - stringY(barre[1]) + 18}
          rx={9}
          fill={colour}
          opacity={0.22}
        />
      ) : null}

      {/* notes */}
      {notes.map((note) => {
        const tone = note.ghost ? (pair?.shape.colour ?? colour) : colour;
        const opacity = note.ghost ? 0.4 : 1;
        return (
          <g
            key={note.key}
            opacity={opacity}
            onPointerDown={onPlayNote ? () => onPlayNote(note.midi) : undefined}
            style={onPlayNote ? { cursor: "pointer" } : undefined}
          >
            <circle cx={note.x} cy={note.y} r={15} fill="transparent" />
            {note.kind === "root" ? (
              <>
                <circle cx={note.x} cy={note.y} r={12} fill={tone} />
                <text className="fb-dot" x={note.x} y={note.y + 4} textAnchor="middle" fill="#12100E">
                  {note.text}
                </text>
              </>
            ) : note.kind === "chord" ? (
              <>
                <circle cx={note.x} cy={note.y} r={12} fill="#241E1A" stroke={tone} strokeWidth={2.5} />
                <text className="fb-dot" x={note.x} y={note.y + 4} textAnchor="middle" fill={tone}>
                  {note.text}
                </text>
              </>
            ) : (
              <>
                <circle cx={note.x} cy={note.y} r={11} fill="#241E1A" stroke="#5C5044" strokeWidth={1} />
                <text className="fb-dot" x={note.x} y={note.y + 4} textAnchor="middle" fill="#948A7D">
                  {note.text}
                </text>
              </>
            )}
          </g>
        );
      })}

      {/* shape names above the neck */}
      {pair && view.secondary ? (
        <text
          className="fb-shape"
          x={Math.max(view.box[0] + 54, fretX(pair.fret === 0 ? 0 : pair.fret))}
          y={TOP_Y - 20}
          textAnchor="middle"
          fill={pair.shape.colour}
          opacity={0.5}
        >
          {pair.name}
        </text>
      ) : null}
      <text
        className="fb-shape"
        x={Math.max(view.box[0] + 54, fretX(position.fret === 0 ? 0 : position.fret))}
        y={TOP_Y - 20}
        textAnchor="middle"
        fill={colour}
      >
        {position.name} shape
      </text>
    </svg>
  );
}

export default memo(Fretboard);
