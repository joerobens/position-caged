import type { Settings, Zoom } from "./settings";
import { clockFor, type Topic } from "./topics";

/**
 * What the current settings actually mean, worked out once.
 *
 * Practice is one choice, the topic, with a clock inside it. Everything the neck
 * draws follows from that, so the rest of the interface never has to reason
 * about it.
 *
 * The rule it still keeps: a control appears only when changing it would change
 * what you see.
 */
export type ViewModel = {
  topic: Topic;
  /** The metronome is part of this topic right now. */
  drilling: boolean;

  /** What the neck is drawing. Exactly one of these is true. */
  rootMapDrawn: boolean;
  chordsDrawn: boolean;
  landmarkDrawn: boolean;
  changesDrawn: boolean;
  spiderDrawn: boolean;
  /** The chords drawn are one of the key's family rather than the key itself. */
  keysDrawn: boolean;

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
  /** Something the controls cannot say for themselves. */
  note: string | null;
};

/** A drill that moves you does nothing until it has a bar count, so it never starts at zero. */
export const DEFAULT_ADVANCE = 2;

export function deriveView(settings: Settings): ViewModel {
  const { topic } = settings;
  const drilling = clockFor(topic, settings.clock) === "drill";

  const rootMapDrawn = topic === "neck";
  const keysDrawn = topic === "keys";
  const chordsDrawn = topic === "shapes" || keysDrawn;
  const landmarkDrawn = topic === "boxes";
  const changesDrawn = topic === "changes";
  const spiderDrawn = topic === "fingers";

  // Whole neck views, the chords of a key and the finger exercise all fix the zoom.
  const zoom: Zoom =
    spiderDrawn || changesDrawn || keysDrawn ? "position" : rootMapDrawn || landmarkDrawn ? "neck" : settings.zoom;

  const allShapes = topic === "shapes" && settings.allShapes;
  const scaleAvailable = topic === "shapes" && !allShapes;
  const moves = drilling && (settings.drill === "caged" || settings.drill === "slide" || settings.drill === "boxes");

  return {
    topic,
    drilling,
    rootMapDrawn,
    chordsDrawn,
    landmarkDrawn,
    changesDrawn,
    spiderDrawn,
    keysDrawn,
    zoom,
    allShapes,
    scaleDrawn: scaleAvailable && settings.showScale,
    zoomAvailable: topic === "shapes" && !allShapes,
    scaleAvailable,
    pairDrawn: topic === "shapes" && drilling && settings.drill === "slide",
    advanceBars: moves ? settings.advanceBars || DEFAULT_ADVANCE : 0,
    note: allShapes ? "All five shows chord tones only, across the whole neck." : null,
  };
}
