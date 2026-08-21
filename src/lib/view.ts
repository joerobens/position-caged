import type { Mode, Settings, Zoom } from "./settings";

/**
 * What the current settings actually mean, worked out once.
 *
 * The rule the interface follows: a control is shown only when changing it would
 * change what you see. Nothing is left on screen inert. Where taking a control away
 * could be confusing, `note` explains what took it over.
 */
export type ViewModel = {
  mode: Mode;
  allShapes: boolean;
  /** Roots only, with the octave links between them. */
  rootMap: boolean;
  zoom: Zoom;
  /** The scale layer is on the neck. */
  scaleDrawn: boolean;
  /** The View control has two distinct outcomes. */
  zoomAvailable: boolean;
  /** The scale layer can be turned on and off. */
  scaleAvailable: boolean;
  /** The second shape of a slide drill is drawn as a dashed box. */
  pairDrawn: boolean;
  /** The neck is showing a finger exercise rather than a shape. */
  spiderDrawn: boolean;
  /** Bars between shape changes, once the drill has had its say. */
  advanceBars: number;
  /** Why the controls above are missing, when they are. */
  note: string | null;
};

export function deriveView(settings: Settings): ViewModel {
  const { allShapes, rootMap, mode, drill } = settings;
  const practising = mode === "practice";
  // The spider walk owns the neck: it is a finger exercise, not a shape.
  const spiderDrawn = practising && drill === "spider";
  const rootMapDrawn = rootMap && !spiderDrawn;

  return {
    mode,
    allShapes: allShapes && !rootMapDrawn && !spiderDrawn,
    rootMap: rootMapDrawn,
    // All five shapes only means anything across the whole neck.
    zoom: spiderDrawn ? "position" : allShapes || rootMapDrawn ? "neck" : settings.zoom,
    scaleDrawn: !allShapes && !rootMapDrawn && !spiderDrawn && settings.showScale,
    zoomAvailable: !allShapes && !rootMapDrawn && !spiderDrawn,
    scaleAvailable: !allShapes && !rootMapDrawn && !spiderDrawn,
    pairDrawn: !allShapes && !rootMapDrawn && !spiderDrawn && practising && drill === "slide",
    spiderDrawn,
    // Only the shape drills move you between positions.
    advanceBars: practising && (drill === "caged" || drill === "slide") ? settings.advanceBars : 0,
    note: rootMapDrawn
      ? "Roots strips the neck back to the one note that names everything. The lines are octaves: the same note in another place, which is the move you make when you shift position."
      : allShapes && !spiderDrawn
        ? "All five covers the whole neck and draws chord tones only, so the view and the scale layer are set for you here. A seven note scale across five positions is around ninety dots, which reads as noise from a music stand."
        : null,
  };
}
