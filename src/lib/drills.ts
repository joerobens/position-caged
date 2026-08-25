import { FRET_COUNT } from "./music";

export type Drill = "caged" | "slide" | "boxes" | "changes" | "spider";

/** Which system a drill belongs to. Technique belongs to none, which is the point. */
export type DrillSystem = "chords" | "scales" | "blues" | "technique";

export const DRILLS: { id: Drill; system: DrillSystem; name: string; blurb: string }[] = [
  {
    id: "caged",
    system: "chords",
    name: "Move between shapes",
    blurb: "The metronome moves you to another shape every few bars. Play through the position you land in.",
  },
  {
    id: "slide",
    system: "chords",
    name: "Two-shape slide",
    blurb: "Back and forth between two positions you pick, so you drill the shift itself rather than the boxes.",
  },
  {
    id: "changes",
    system: "blues",
    name: "Walk the form",
    blurb: "The metronome walks the form a bar at a time. Stay where you are and follow the chord, aiming at its third.",
  },
  {
    id: "boxes",
    system: "scales",
    name: "Box to box",
    blurb: "The metronome walks you through the pentatonic boxes. The same idea as moving between chord shapes, for the map you actually solo from.",
  },
  {
    id: "spider",
    system: "technique",
    name: "Spider walk",
    blurb: "The chromatic finger exercise, one note per pulse, with the neck showing you where you are in it.",
  },
];

/** Finger order within the four fret span. The numbers are fingers, not frets. */
export const SPIDER_PATTERNS = ["1-2-3-4", "1-3-2-4", "1-4-2-3", "2-1-4-3"] as const;
export type SpiderPattern = (typeof SPIDER_PATTERNS)[number];

export type SpiderSettings = {
  startFret: number;
  pattern: SpiderPattern;
  /** Come back down as well as going up. */
  both: boolean;
  /** Move up a fret at the end of each cycle. */
  shift: boolean;
};

export type SpiderStep = { string: number; fret: number; finger: number };

/** How far the exercise walks up the neck before dropping back to where it started. */
const SHIFT_LIMIT = 8;

function fingerOrder(pattern: SpiderPattern): number[] {
  return pattern.split("-").map(Number);
}

/**
 * One pass of the exercise: the finger pattern on each string in turn, up the
 * strings and then back down. The descent reverses the pattern so the line stays
 * continuous rather than jumping back to the index finger on every string.
 */
function cycle(startFret: number, pattern: SpiderPattern, both: boolean): SpiderStep[] {
  const fingers = fingerOrder(pattern);
  const steps: SpiderStep[] = [];
  for (let string = 0; string < 6; string++) {
    for (const finger of fingers) {
      steps.push({ string, fret: startFret + finger - 1, finger });
    }
  }
  if (both) {
    for (let string = 5; string >= 0; string--) {
      for (const finger of [...fingers].reverse()) {
        steps.push({ string, fret: startFret + finger - 1, finger });
      }
    }
  }
  return steps;
}

/**
 * The whole exercise as one flat list. The cursor is an index into this, so the
 * metronome only has to count: it never needs to know what a spider walk is.
 */
export function spiderSequence({ startFret, pattern, both, shift }: SpiderSettings): SpiderStep[] {
  if (!shift) return cycle(startFret, pattern, both);
  const steps: SpiderStep[] = [];
  for (let offset = 0; offset < SHIFT_LIMIT; offset++) {
    const fret = startFret + offset;
    // Stop climbing rather than running off the end of the neck.
    if (fret + 3 > FRET_COUNT) break;
    steps.push(...cycle(fret, pattern, both));
  }
  return steps.length ? steps : cycle(startFret, pattern, both);
}

/** Where the exercise is at a given pulse, wrapping round forever. */
export function spiderStepAt(sequence: SpiderStep[], pulse: number): number {
  if (!sequence.length) return 0;
  return ((pulse % sequence.length) + sequence.length) % sequence.length;
}

/** Where a pentatonic drill sends you next. */
export type BoxMode = "up" | "landmarks" | "random";

export const BOX_MODES: { value: BoxMode; label: string; title: string }[] = [
  { value: "up", label: "Up the neck", title: "Boxes one to five in order" },
  { value: "landmarks", label: "Landmarks only", title: "Back and forth between shapes one and four" },
  { value: "random", label: "Random", title: "Any other box" },
];

export function drillsFor(system: DrillSystem) {
  return DRILLS.filter((drill) => drill.system === system);
}
