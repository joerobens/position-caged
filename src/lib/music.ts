/**
 * Fretboard and CAGED theory.
 *
 * Everything here is pitch-class arithmetic on the open strings. Fret numbers are
 * positions on the neck, not sounding pitch, so a capo or a down-tuned guitar does
 * not change any of the geometry.
 */

/** Low E to high e, as pitch classes (0 = C). */
export const OPEN = [4, 9, 2, 7, 11, 4] as const;
export const STRING_LABELS = ["E", "A", "D", "G", "B", "e"] as const;

export const NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"] as const;
/** Spelling used in the key selector: flats where a guitarist would say flats. */
export const KEYS = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"] as const;
export const DEGREES = ["1", "b2", "2", "b3", "3", "4", "b5", "5", "b6", "6", "b7", "7"] as const;

export const FRET_COUNT = 15;

export type Tonality = "major" | "minor";
export type ShapeName = "C" | "A" | "G" | "E" | "D";
export const SHAPE_ORDER: ShapeName[] = ["C", "A", "G", "E", "D"];

export type Shape = {
  /** Fret offsets from the shape's index-finger position. null = string not played. */
  frets: (number | null)[];
  /** String index and fret offset where the shape's root sits. */
  rootString: number;
  rootOffset: number;
  colour: string;
  /** Strings covered by the barre, when the shape is played as a barre chord. */
  barre?: [number, number];
};

/**
 * The five shapes in both qualities. The minor forms are the major forms with every
 * major third pulled down a semitone; where that lands off the shape (the high strings
 * of the C and G forms) the note moves to the fifth instead.
 */
export const SHAPES: Record<ShapeName, Record<Tonality, Shape>> = {
  C: {
    major: { frets: [null, 3, 2, 0, 1, 0], rootString: 1, rootOffset: 3, colour: "#B48CFF" },
    minor: { frets: [null, 3, 1, 0, 1, 3], rootString: 1, rootOffset: 3, colour: "#B48CFF" },
  },
  A: {
    major: { frets: [null, 0, 2, 2, 2, 0], rootString: 1, rootOffset: 0, colour: "#4FC7A1", barre: [1, 5] },
    minor: { frets: [null, 0, 2, 2, 1, 0], rootString: 1, rootOffset: 0, colour: "#4FC7A1", barre: [1, 5] },
  },
  G: {
    major: { frets: [3, 2, 0, 0, 0, 3], rootString: 0, rootOffset: 3, colour: "#FF8A5B" },
    minor: { frets: [3, 1, 0, 0, 3, 3], rootString: 0, rootOffset: 3, colour: "#FF8A5B" },
  },
  E: {
    major: { frets: [0, 2, 2, 1, 0, 0], rootString: 0, rootOffset: 0, colour: "#6FA8FF", barre: [0, 5] },
    minor: { frets: [0, 2, 2, 0, 0, 0], rootString: 0, rootOffset: 0, colour: "#6FA8FF", barre: [0, 5] },
  },
  D: {
    major: { frets: [null, null, 0, 2, 3, 2], rootString: 2, rootOffset: 0, colour: "#F0C24B" },
    minor: { frets: [null, null, 0, 2, 3, 1], rootString: 2, rootOffset: 0, colour: "#F0C24B" },
  },
};

export const SCALES: Record<Tonality, Record<string, number[]>> = {
  major: {
    "Chord tones": [0, 4, 7],
    "Major pent": [0, 2, 4, 7, 9],
    "Minor pent": [0, 3, 5, 7, 10],
    Blues: [0, 3, 5, 6, 7, 10],
    Mixolydian: [0, 2, 4, 5, 7, 9, 10],
    Major: [0, 2, 4, 5, 7, 9, 11],
  },
  minor: {
    "Chord tones": [0, 3, 7],
    "Minor pent": [0, 3, 5, 7, 10],
    Blues: [0, 3, 5, 6, 7, 10],
    "Natural minor": [0, 2, 3, 5, 7, 8, 10],
    Dorian: [0, 2, 3, 5, 7, 9, 10],
    "Harmonic minor": [0, 2, 3, 5, 7, 8, 11],
  },
};

/** The scale that stays selected when you flip between major and minor. */
export const EQUIVALENT_SCALE: Record<string, string> = {
  "Major pent": "Minor pent",
  Major: "Natural minor",
  Mixolydian: "Dorian",
  "Minor pent": "Minor pent",
  "Natural minor": "Major",
  Dorian: "Mixolydian",
  "Harmonic minor": "Major",
};

export type Position = {
  name: ShapeName;
  /** Fret the index finger sits at. 0 means the shape is played at the nut. */
  fret: number;
  shape: Shape;
};

/** The five shapes for a key, ordered up the neck. */
export function buildPositions(root: number, tonality: Tonality): Position[] {
  return SHAPE_ORDER.map((name) => {
    const shape = SHAPES[name][tonality];
    const fret = (((root - OPEN[shape.rootString] - shape.rootOffset) % 12) + 12) % 12;
    return { name, fret, shape };
  }).sort((a, b) => a.fret - b.fret);
}

/** Frets this shape actually holds down, as `${string}:${fret}` keys. */
export function chordToneKeys(position: Position): Set<string> {
  const keys = new Set<string>();
  position.shape.frets.forEach((offset, string) => {
    if (offset === null) return;
    const fret = position.fret + offset;
    if (fret <= FRET_COUNT) keys.add(`${string}:${fret}`);
  });
  return keys;
}

export function degreeAt(string: number, fret: number, root: number): number {
  return (OPEN[string] + fret - root + 120) % 12;
}

export function noteNameAt(string: number, fret: number): string {
  return NAMES[(OPEN[string] + fret) % 12];
}

/** Concert pitch of a pitch class in a given octave, for the drone. */
export function pitchClassToFrequency(pitchClass: number, octave: number): number {
  // MIDI 36 is C2, a comfortable floor for a drone under a guitar.
  const midi = 36 + pitchClass + octave * 12;
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export function keyLabel(root: number, tonality: Tonality): string {
  return `${KEYS[root]}${tonality === "minor" ? "m" : ""}`;
}

/** Chord tones of the key itself: root, third, fifth. */
export function triadOf(tonality: Tonality): number[] {
  return SCALES[tonality]["Chord tones"];
}

export type GripMap = Map<string, ShapeName[]>;

/**
 * Which of the five shapes frets each position. Shapes overlap by design: the notes
 * two neighbouring shapes share are the seam you slide across, so a position can
 * belong to more than one and both colours are worth showing.
 */
export function gripMembership(positions: Position[]): GripMap {
  const map: GripMap = new Map();
  for (const position of positions) {
    position.shape.frets.forEach((offset, string) => {
      if (offset === null) return;
      const fret = position.fret + offset;
      if (fret > FRET_COUNT) return;
      const key = `${string}:${fret}`;
      const owners = map.get(key);
      if (owners) owners.push(position.name);
      else map.set(key, [position.name]);
    });
  }
  return map;
}

/** Every chord tone on the neck, whether or not a shape frets it. */
export function chordTonesOnNeck(root: number, tonality: Tonality) {
  const triad = triadOf(tonality);
  const out: { string: number; fret: number; degree: number }[] = [];
  for (let string = 0; string < 6; string++) {
    for (let fret = 0; fret <= FRET_COUNT; fret++) {
      const degree = degreeAt(string, fret, root);
      if (triad.includes(degree)) out.push({ string, fret, degree });
    }
  }
  return out;
}
