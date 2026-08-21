"use client";

import { memo, useMemo } from "react";
import {
  DEGREES,
  KEYS,
  FRET_COUNT,
  STRING_LABELS,
  chordToneKeys,
  chordTonesOnNeck,
  degreeAt,
  gripMembership,
  noteNameAt,
  type Position,
  type Tonality,
} from "@/lib/music";
import type { Labels, Zoom } from "@/lib/settings";
import type { SpiderStep } from "@/lib/drills";

/** Neck geometry, in SVG user units. */
const NUT_X = 64;
const FRET_WIDTH = 44;
const TOP_Y = 46;
const STRING_GAP = 30;
const BOARD_WIDTH = NUT_X + FRET_COUNT * FRET_WIDTH + 22;
const BOARD_HEIGHT = TOP_Y + 5 * STRING_GAP + 48;
/** Extra room under the neck for the five shape bars in the all-shapes view. */
const MAP_HEIGHT = 52;
const MAP_TOP = TOP_Y + 5 * STRING_GAP + 38;
const MAP_ROW = 10;
const INLAYS = [3, 5, 7, 9, 15];

/** Open-string MIDI numbers, low E to high e. */
const STRING_MIDI = [40, 45, 50, 55, 59, 64];

const fretX = (fret: number) => (fret === 0 ? NUT_X - 22 : NUT_X + (fret - 0.5) * FRET_WIDTH);
/** What goes inside a dot. Empty is a real answer: it is how you test yourself. */
const dotLabel = (labels: Labels, degree: number, string: number, fret: number) =>
  labels === "none" ? "" : labels === "degrees" ? DEGREES[degree] : noteNameAt(string, fret);
const stringY = (string: number) => TOP_Y + (5 - string) * STRING_GAP;
/** Left edge of the block of frets from `low` to `high`. */
const blockLeft = (low: number) => (low === 0 ? NUT_X - 34 : NUT_X + (low - 1) * FRET_WIDTH);
const blockRight = (high: number) => NUT_X + high * FRET_WIDTH;

type Props = {
  position: Position;
  /** All five, ordered up the neck. Only used by the all-shapes view. */
  positions: Position[];
  /** The other shape in a slide drill, drawn as a ghost box. */
  pair?: Position | null;
  root: number;
  tonality: Tonality;
  intervals: number[];
  zoom: Zoom;
  labels: Labels;
  /** Show every shape at once, each in its own colour. */
  allShapes?: boolean;
  /** Show only the roots, joined by their octave links. */
  rootMap?: boolean;
  /** The scale layer. Off leaves the chord tones on their own. */
  showScale?: boolean;
  /** A finger exercise, with the cursor sitting on the note due now. */
  spider?: { steps: SpiderStep[]; index: number } | null;
  onPlayNote?: (midi: number) => void;
};

type Window = { low: number; high: number };

const windowFor = (position: Position): Window => ({
  low: Math.max(0, position.fret - 1),
  high: Math.min(FRET_COUNT, position.fret + 4),
});

/** A pie slice, for a note two shapes both lay claim to. */
function wedge(cx: number, cy: number, r: number, from: number, to: number) {
  const a0 = ((from - 90) * Math.PI) / 180;
  const a1 = ((to - 90) * Math.PI) / 180;
  const large = to - from > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${cx + r * Math.cos(a0)} ${cy + r * Math.sin(a0)} A ${r} ${r} 0 ${large} 1 ${cx + r * Math.cos(a1)} ${cy + r * Math.sin(a1)} Z`;
}
/** The same slice as an open arc, for ringed notes. */
function arc(cx: number, cy: number, r: number, from: number, to: number) {
  const a0 = ((from - 90) * Math.PI) / 180;
  const a1 = ((to - 90) * Math.PI) / 180;
  const large = to - from > 180 ? 1 : 0;
  return `M ${cx + r * Math.cos(a0)} ${cy + r * Math.sin(a0)} A ${r} ${r} 0 ${large} 1 ${cx + r * Math.cos(a1)} ${cy + r * Math.sin(a1)}`;
}

function Fretboard({
  position,
  positions,
  pair,
  root,
  tonality,
  intervals,
  zoom,
  labels,
  allShapes = false,
  rootMap = false,
  showScale = true,
  spider = null,
  onPlayNote,
}: Props) {
  const spiderWindow = useMemo(() => {
    if (!spider?.steps.length) return null;
    const step = spider.steps[spider.index] ?? spider.steps[0];
    const low = step.fret - step.finger + 1;
    return { low, high: Math.min(FRET_COUNT, low + 3) };
  }, [spider]);

  const view = useMemo(() => {
    if (spiderWindow) {
      const left = blockLeft(spiderWindow.low);
      const right = blockRight(spiderWindow.high);
      const gutter = spiderWindow.low === 0 ? -28 : left - 34;
      return {
        primary: spiderWindow,
        secondary: null,
        labelX: gutter + 14,
        box: [gutter, 0, right - gutter + 16, BOARD_HEIGHT],
      };
    }
    const primary = windowFor(position);
    const secondary = pair ? windowFor(pair) : null;
    const span = secondary
      ? { low: Math.min(primary.low, secondary.low), high: Math.max(primary.high, secondary.high) }
      : primary;

    const left = blockLeft(span.low);
    const right = blockRight(span.high);
    const gutter = span.low === 0 ? -28 : left - 34;
    const height = allShapes || rootMap ? BOARD_HEIGHT + MAP_HEIGHT : BOARD_HEIGHT;
    const box =
      zoom === "position" && !allShapes && !rootMap
        ? [gutter, 0, right - gutter + 16, height]
        : [0, 0, BOARD_WIDTH, height];
    return {
      primary,
      secondary,
      labelX: zoom === "position" && !allShapes && !rootMap ? gutter + 14 : 14,
      box,
    };
  }, [position, pair, zoom, allShapes, rootMap, spiderWindow]);

  const colour = position.shape.colour;
  const chordTones = useMemo(() => chordToneKeys(position), [position]);
  const grips = useMemo(() => (allShapes || rootMap ? gripMembership(positions) : null), [allShapes, rootMap, positions]);
  const colourOf = useMemo(() => {
    const map = new Map<string, string>();
    positions.forEach((entry) => map.set(entry.name, entry.shape.colour));
    return map;
  }, [positions]);

  const visibleFrets = useMemo(() => {
    const frets: number[] = [];
    for (let f = 0; f <= FRET_COUNT; f++) {
      if (zoom === "position" && !allShapes && !rootMap) {
        const inPrimary = f >= view.primary.low - 1 && f <= view.primary.high + 1;
        const inSecondary = !!view.secondary && f >= view.secondary.low - 1 && f <= view.secondary.high + 1;
        if (!inPrimary && !inSecondary) continue;
      }
      frets.push(f);
    }
    return frets;
  }, [zoom, allShapes, rootMap, view]);

  /**
   * Every shape at once. Notes a shape frets take that shape's colour, notes two
   * shapes share are split between both, and the chord tones no shape frets sit
   * behind them faintly so the neck reads as full rather than as five islands.
   */
  const allNotes = useMemo(() => {
    if (!allShapes || rootMap || spiderWindow || !grips) return null;
    return chordTonesOnNeck(root, tonality).map((note) => {
      const key = `${note.string}:${note.fret}`;
      const owners = grips.get(key) ?? [];
      return {
        ...note,
        key,
        owners,
        colours: owners.map((name) => colourOf.get(name) ?? colour),
        x: fretX(note.fret),
        y: stringY(note.string),
        isRoot: note.degree === 0,
        text: dotLabel(labels, note.degree, note.string, note.fret),
        midi: STRING_MIDI[note.string] + note.fret,
      };
    });
  }, [allShapes, rootMap, spiderWindow, grips, root, tonality, colourOf, colour, labels]);


  /**
   * Every root on the neck, and the octave links between them. The links are the
   * point: a root joined to the same note two strings over is the shift you make
   * when you move position, so the lattice is what you are actually learning.
   */
  const rootLattice = useMemo(() => {
    if (!rootMap) return null;
    const notes: { key: string; string: number; fret: number; x: number; y: number; midi: number; colour: string }[] = [];
    for (let string = 0; string < 6; string++) {
      for (let fret = 0; fret <= FRET_COUNT; fret++) {
        if (degreeAt(string, fret, root) !== 0) continue;
        const owners = grips?.get(`${string}:${fret}`) ?? [];
        notes.push({
          key: `${string}:${fret}`,
          string,
          fret,
          x: fretX(fret),
          y: stringY(string),
          midi: STRING_MIDI[string] + fret,
          colour: owners.length ? (colourOf.get(owners[0]) ?? colour) : "#948A7D",
        });
      }
    }
    const links: { key: string; a: (typeof notes)[number]; b: (typeof notes)[number]; wide: boolean }[] = [];
    for (const a of notes) {
      for (const b of notes) {
        if (b.string <= a.string) continue;
        const strings = b.string - a.string;
        const semitones = b.midi - a.midi;
        // The two shapes every guitarist ends up knowing: the octave two strings
        // over, and the double octave straight across all six.
        const octave = semitones === 12 && (strings === 2 || strings === 3);
        const doubleOctave = semitones === 24 && strings === 5;
        if (octave || doubleOctave) links.push({ key: `${a.key}-${b.key}`, a, b, wide: doubleOctave });
      }
    }
    return { notes, links };
  }, [rootMap, root, grips, colourOf, colour]);

  const notes = useMemo(() => {
    if (allShapes || rootMap || spiderWindow) return [];
    const out: {
      key: string;
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
        const inScale = showScale && intervals.includes(degree);
        if (!inScale && !isChordTone) continue;
        out.push({
          key: `${string}:${fret}`,
          x: fretX(fret),
          y: stringY(string),
          text: dotLabel(labels, degree, string, fret),
          kind: degree === 0 ? "root" : isChordTone ? "chord" : "scale",
          ghost: !primary,
          midi: STRING_MIDI[string] + fret,
        });
      }
    }
    return out;
  }, [allShapes, rootMap, spiderWindow, view, root, intervals, chordTones, labels, showScale]);

  const barre = position.shape.barre;
  const primaryLeft = blockLeft(view.primary.low);
  const primaryRight = blockRight(view.primary.high);

  return (
    <svg
      className="block h-auto w-full"
      viewBox={view.box.join(" ")}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={
        spiderWindow
          ? `Guitar neck showing a spider walk across frets ${spiderWindow.low} to ${spiderWindow.high}`
          : rootMap
            ? `Guitar neck showing every ${KEYS[root]} root and the octave links between them`
            : allShapes
            ? "Guitar neck showing all five CAGED shapes, each in its own colour"
            : `Guitar neck showing the ${position.name} shape at fret ${position.fret}`
      }
    >
      {/* position shading */}
      {view.secondary && pair && !allShapes ? (
        <rect
          x={blockLeft(view.secondary.low)}
          y={TOP_Y - 11}
          width={blockRight(view.secondary.high) - blockLeft(view.secondary.low)}
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
        x={primaryLeft}
        y={TOP_Y - 11}
        width={primaryRight - primaryLeft}
        height={5 * STRING_GAP + 22}
        rx={10}
        fill={colour}
        opacity={spiderWindow ? 0.04 : allShapes || rootMap ? 0.05 : zoom === "position" ? 0.06 : 0.09}
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
      {position.fret === 0 && !allShapes && !rootMap && !spiderWindow
        ? position.shape.frets.map((offset, string) =>
            offset === null ? (
              <text key={`mute-${string}`} className="fb-mark" x={NUT_X - 20} y={stringY(string) + 4} textAnchor="middle">
                ×
              </text>
            ) : null,
          )
        : null}

      {/* barre */}
      {barre && position.fret > 0 && !allShapes && !rootMap && !spiderWindow ? (
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

      {/* notes, one position at a time */}
      {notes.map((note) => {
        const tone = note.ghost ? (pair?.shape.colour ?? colour) : colour;
        return (
          <g
            key={note.key}
            opacity={note.ghost ? 0.4 : 1}
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
                <circle cx={note.x} cy={note.y} r={11} fill="#241E1A" stroke="#7A6B5C" strokeWidth={1} />
                <text className="fb-dot" x={note.x} y={note.y + 4} textAnchor="middle" fill="#948A7D">
                  {note.text}
                </text>
              </>
            )}
          </g>
        );
      })}

      {/* notes, all five shapes at once */}
      {allNotes?.map((note) => {
        const owned = note.owners.length > 0;
        const step = owned ? 360 / note.owners.length : 360;
        return (
          <g
            key={note.key}
            opacity={owned ? 1 : 0.42}
            onPointerDown={onPlayNote ? () => onPlayNote(note.midi) : undefined}
            style={onPlayNote ? { cursor: "pointer" } : undefined}
          >
            <circle cx={note.x} cy={note.y} r={15} fill="transparent" />
            {!owned ? (
              <circle cx={note.x} cy={note.y} r={11} fill="#241E1A" stroke="#7A6B5C" strokeWidth={1} />
            ) : note.isRoot ? (
              // One owner is a plain disc: a wedge spanning the full 360 has identical
              // endpoints, and SVG draws nothing at all for a zero length arc.
              note.colours.length === 1 ? (
                <circle cx={note.x} cy={note.y} r={12} fill={note.colours[0]} />
              ) : (
                <>
                  {note.colours.map((tone, index) => (
                    <path key={index} d={wedge(note.x, note.y, 12, index * step, (index + 1) * step)} fill={tone} />
                  ))}
                </>
              )
            ) : (
              <>
                <circle cx={note.x} cy={note.y} r={12} fill="#241E1A" />
                {note.colours.length === 1 ? (
                  <circle cx={note.x} cy={note.y} r={12} fill="none" stroke={note.colours[0]} strokeWidth={2.5} />
                ) : (
                  note.colours.map((tone, index) => (
                    <path
                      key={index}
                      d={arc(note.x, note.y, 12, index * step, (index + 1) * step)}
                      fill="none"
                      stroke={tone}
                      strokeWidth={2.5}
                    />
                  ))
                )}
              </>
            )}
            <text
              className="fb-dot"
              x={note.x}
              y={note.y + 4}
              textAnchor="middle"
              fill={!owned ? "#948A7D" : note.isRoot ? "#12100E" : note.colours[0]}
            >
              {note.text}
            </text>
          </g>
        );
      })}

      {/* the roots, and the octave links that join them up */}
      {rootLattice ? (
        <>
          {rootLattice.links.map((link) => (
            <line
              key={link.key}
              x1={link.a.x}
              y1={link.a.y}
              x2={link.b.x}
              y2={link.b.y}
              stroke={link.wide ? "#7A6B5C" : colour}
              strokeWidth={link.wide ? 1 : 1.5}
              strokeOpacity={link.wide ? 0.35 : 0.5}
              strokeDasharray={link.wide ? "3 5" : undefined}
            />
          ))}
          {rootLattice.notes.map((note) => (
            <g
              key={note.key}
              onPointerDown={onPlayNote ? () => onPlayNote(note.midi) : undefined}
              style={onPlayNote ? { cursor: "pointer" } : undefined}
            >
              <circle cx={note.x} cy={note.y} r={15} fill="transparent" />
              <circle cx={note.x} cy={note.y} r={13} fill={note.colour} />
              <text className="fb-dot" x={note.x} y={note.y + 4} textAnchor="middle" fill="#12100E">
                {labels === "none" ? "" : labels === "notes" ? noteNameAt(note.string, note.fret) : "1"}
              </text>
            </g>
          ))}
        </>
      ) : null}

      {/* the finger exercise: one bright dot moving, the rest of the box behind it */}
      {spider && spiderWindow
        ? (() => {
            const current = spider.steps[spider.index];
            const next = spider.steps[(spider.index + 1) % spider.steps.length];
            // Every position in this four fret box, so the shape of the exercise is visible.
            const cells: { string: number; fret: number; finger: number }[] = [];
            for (let string = 0; string < 6; string++) {
              for (let finger = 1; finger <= 4; finger++) {
                const fret = spiderWindow.low + finger - 1;
                if (fret <= FRET_COUNT) cells.push({ string, fret, finger });
              }
            }
            return cells.map((cell) => {
              const isCurrent = current && cell.string === current.string && cell.fret === current.fret;
              const isNext = !isCurrent && next && cell.string === next.string && cell.fret === next.fret;
              return (
                <g
                  key={`spider-${cell.string}:${cell.fret}`}
                  onPointerDown={onPlayNote ? () => onPlayNote(STRING_MIDI[cell.string] + cell.fret) : undefined}
                  style={onPlayNote ? { cursor: "pointer" } : undefined}
                >
                  <circle cx={fretX(cell.fret)} cy={stringY(cell.string)} r={15} fill="transparent" />
                  <circle
                    cx={fretX(cell.fret)}
                    cy={stringY(cell.string)}
                    r={isCurrent ? 14 : 11}
                    fill={isCurrent ? colour : "#241E1A"}
                    stroke={isCurrent ? colour : isNext ? colour : "#7A6B5C"}
                    strokeWidth={isCurrent ? 0 : isNext ? 2 : 1}
                    opacity={isCurrent || isNext ? 1 : 0.45}
                  />
                  <text
                    className="fb-dot"
                    x={fretX(cell.fret)}
                    y={stringY(cell.string) + 4}
                    textAnchor="middle"
                    fill={isCurrent ? "#12100E" : isNext ? colour : "#948A7D"}
                    opacity={isCurrent || isNext ? 1 : 0.45}
                  >
                    {cell.finger}
                  </text>
                </g>
              );
            });
          })()
        : null}

      {/* where each shape sits, and which colour is which */}
      {allShapes || rootMap
        ? positions.map((entry, index) => {
            const window = windowFor(entry);
            const left = blockLeft(window.low);
            const right = blockRight(window.high);
            const y = MAP_TOP + index * MAP_ROW;
            const current = entry.name === position.name;
            return (
              <g key={`map-${entry.name}`} opacity={current ? 1 : 0.5}>
                <rect x={left} y={y} width={right - left} height={7} rx={3.5} fill={entry.shape.colour} />
                <text className="fb-mark" x={left - 10} y={y + 7} textAnchor="end" fill={entry.shape.colour}>
                  {entry.name}
                </text>
              </g>
            );
          })
        : null}

      {/* shape names above the neck */}
      {pair && view.secondary && !allShapes ? (
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
        x={allShapes || spiderWindow ? view.box[0] + 14 : Math.max(view.box[0] + 54, fretX(position.fret === 0 ? 0 : position.fret))}
        y={TOP_Y - 20}
        textAnchor={allShapes || spiderWindow ? "start" : "middle"}
        fill={colour}
      >
        {spiderWindow
          ? `Spider walk · frets ${spiderWindow.low} to ${spiderWindow.high}`
          : rootMap
            ? `Every ${KEYS[root]} on the neck · lines are octaves`
            : allShapes
              ? `All five shapes · ${position.name} highlighted`
              : `${position.name} shape`}
      </text>
    </svg>
  );
}

export default memo(Fretboard);
