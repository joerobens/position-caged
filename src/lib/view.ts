import type { Mode, Settings, System, Zoom } from "./settings";

/**
 * What the current settings actually mean, worked out once.
 *
 * Play is two questions rather than one pile. The mode is what you are doing:
 * exploring, drilling against a clock, or working the fingers. The system is what
 * you are working on. Everything the neck draws follows from that pair, so the
 * rest of the interface never has to reason about it.
 *
 * The rule it still keeps: a control appears only when changing it would change
 * what you see.
 */
export type ViewModel = {
  mode: Mode;
  /** Null in technique, which genuinely has no system. */
  system: System | null;

  /** What the neck is drawing. Exactly one of these is true. */
  rootMapDrawn: boolean;
  chordsDrawn: boolean;
  landmarkDrawn: boolean;
  changesDrawn: boolean;
  spiderDrawn: boolean;

  zoom: Zoom;
  /** All five chord shapes at once, rather than one. */
  allShapes: boolean;
  /** The scale layer is on the neck. */
  scaleDrawn: boolean;
  /** The View control has two distinct outcomes. */
  zoomAvailable: boolean;
  /** The scale layer can be turned on and off. */
  scaleAvailable: boolean;
  /** The second shape of a slide drill is drawn as a dashed box. */
  pairDrawn: boolean;
  /** Bars between moves, once the drill has had its say. */
  advanceBars: number;
  /** What the mode and system together mean, when it is worth saying. */
  note: string | null;
};

const NOTES: Partial<Record<System, string>> = {
  neck: "The neck itself: every root in the key and the octave links that join them. This is the layer everything else is built on, and the one worth knowing cold.",
  scales:
    "The pentatonic seen as five numbered boxes rather than through the chord shapes. Two of them do the work: shape one with its root under your index finger on the low E, shape four with its root on the A string.",
  blues:
    "Following the chords rather than the key. Degrees count from the chord you are on, so the third always reads 3 and you can watch it move when the chord does.",
};

export function deriveView(settings: Settings): ViewModel {
  const { mode } = settings;
  const technique = mode === "technique";
  const drilling = mode === "drill";
  // Technique sits outside the systems, so it does not have one.
  const system = technique ? null : settings.system;

  const rootMapDrawn = system === "neck";
  const chordsDrawn = system === "chords";
  const landmarkDrawn = system === "scales";
  const changesDrawn = system === "blues";

  // Whole neck views and the finger exercise both fix the zoom for you.
  const zoom: Zoom =
    technique || changesDrawn ? "position" : rootMapDrawn || landmarkDrawn ? "neck" : settings.zoom;

  const allShapes = chordsDrawn && settings.allShapes;
  const scaleAvailable = chordsDrawn && !allShapes;

  return {
    mode,
    system,
    rootMapDrawn,
    chordsDrawn,
    landmarkDrawn,
    changesDrawn,
    spiderDrawn: technique,
    zoom,
    allShapes,
    scaleDrawn: scaleAvailable && settings.showScale,
    zoomAvailable: chordsDrawn && !allShapes,
    scaleAvailable,
    pairDrawn: chordsDrawn && drilling && settings.drill === "slide",
    // Only the drills that move you somewhere use the bar count.
    advanceBars: drilling && settings.drill !== "spider" ? settings.advanceBars : 0,
    note: allShapes
      ? "All five covers the whole neck and draws chord tones only. A seven note scale across five positions is around ninety dots, which reads as noise from a music stand."
      : (system && NOTES[system]) ?? null,
  };
}
