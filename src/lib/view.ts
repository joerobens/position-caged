import type { Settings, Zoom } from "./settings";

/**
 * What the current settings actually mean, worked out once.
 *
 * The rule the interface follows: a control is shown only when changing it would
 * change what you see. Nothing is left on screen inert. Where taking a control away
 * could be confusing, `note` explains what took it over.
 */
export type ViewModel = {
  allShapes: boolean;
  zoom: Zoom;
  /** The scale layer is on the neck. */
  scaleDrawn: boolean;
  /** The View control has two distinct outcomes. */
  zoomAvailable: boolean;
  /** The scale layer can be turned on and off. */
  scaleAvailable: boolean;
  /** The second shape of a slide drill is drawn as a dashed box. */
  pairDrawn: boolean;
  /** Why the controls above are missing, when they are. */
  note: string | null;
};

export function deriveView(settings: Settings): ViewModel {
  const { allShapes } = settings;
  return {
    allShapes,
    // All five shapes only means anything across the whole neck.
    zoom: allShapes ? "neck" : settings.zoom,
    scaleDrawn: !allShapes && settings.showScale,
    zoomAvailable: !allShapes,
    scaleAvailable: !allShapes,
    pairDrawn: !allShapes && settings.advanceMode === "pair",
    note: allShapes
      ? "All five covers the whole neck and draws chord tones only, so the view and the scale layer are set for you here. A seven note scale across five positions is around ninety dots, which reads as noise from a music stand."
      : null,
  };
}
