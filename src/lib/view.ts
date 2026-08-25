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
  /** The neck is following a progression, chord by chord. */
  changesDrawn: boolean;
  /** The neck is showing pentatonic boxes rather than CAGED shapes. */
  landmarkDrawn: boolean;
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
  // Changes is a drill when the clock is running it and a layer when you are not.
  const changesDrawn = !spiderDrawn && (practising ? drill === "changes" : settings.changes);
  const landmarkDrawn = settings.landmark && !spiderDrawn && !changesDrawn;
  const rootMapDrawn = rootMap && !spiderDrawn && !changesDrawn && !landmarkDrawn;

  return {
    mode,
    allShapes: allShapes && !rootMapDrawn && !spiderDrawn && !changesDrawn && !landmarkDrawn,
    rootMap: rootMapDrawn,
    changesDrawn,
    landmarkDrawn,
    // All five shapes only means anything across the whole neck.
    zoom: spiderDrawn || changesDrawn ? "position" : allShapes || rootMapDrawn || landmarkDrawn ? "neck" : settings.zoom,
    scaleDrawn: !allShapes && !rootMapDrawn && !spiderDrawn && !landmarkDrawn && settings.showScale,
    zoomAvailable: !allShapes && !rootMapDrawn && !spiderDrawn && !changesDrawn && !landmarkDrawn,
    scaleAvailable: !allShapes && !rootMapDrawn && !spiderDrawn && !landmarkDrawn,
    pairDrawn: !allShapes && !rootMapDrawn && !spiderDrawn && !changesDrawn && practising && drill === "slide",
    spiderDrawn,
    // Only the shape drills move you between positions.
    advanceBars: practising && (drill === "caged" || drill === "slide") ? settings.advanceBars : 0,
    note: landmarkDrawn
      ? "Landmark is the pentatonic seen as five numbered boxes rather than through the CAGED shapes. Two of them do the work: shape one with its root under your index finger on the low E, shape four with its root on the A string. Find those two and you are never lost."
      : changesDrawn
      ? "Changes follows the progression instead of one chord. The shape chips still choose the region you play in; the neck brings each chord to you there. Degrees are counted from the chord you are on, not from the key, which is the point: the third moves when the chord does."
      : rootMapDrawn
      ? "Roots strips the neck back to the one note that names everything. The lines are octaves: the same note in another place, which is the move you make when you shift position."
      : allShapes && !spiderDrawn
        ? "All five covers the whole neck and draws chord tones only, so the view and the scale layer are set for you here. A seven note scale across five positions is around ninety dots, which reads as noise from a music stand."
        : null,
  };
}
