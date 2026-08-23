"use client";

import Fretboard from "@/components/Fretboard";
import { useSettings } from "@/hooks/useSettings";
import { useTheme } from "@/hooks/useTheme";
import { SCALES, buildPositions, type Tonality } from "@/lib/music";
import { paletteFor } from "@/lib/theme";
import type { Labels, Zoom } from "@/lib/settings";
import type { Chord } from "@/lib/progressions";

/**
 * A neck on a theory page, drawn by the component the tool uses. Nothing here is
 * a screenshot, so a change to the drawing cannot leave the explanation behind.
 */
export default function TheoryNeck({
  root = 0,
  tonality = "major",
  shape,
  scale = "Major pent",
  showScale = true,
  allShapes = false,
  rootMap = false,
  chord = null,
  zoom = "position",
  labels = "degrees",
  caption,
}: {
  root?: number;
  tonality?: Tonality;
  /** Which of the five, by name. Defaults to the one nearest the nut. */
  shape?: "C" | "A" | "G" | "E" | "D";
  scale?: string;
  showScale?: boolean;
  allShapes?: boolean;
  rootMap?: boolean;
  chord?: Chord | null;
  zoom?: Zoom;
  labels?: Labels;
  caption?: string;
}) {
  const { settings } = useSettings();
  const palette = paletteFor(useTheme(settings.theme));
  const positions = buildPositions(root, tonality);
  const position = (shape && positions.find((entry) => entry.name === shape)) || positions[0];
  const intervals = SCALES[tonality][scale] ?? SCALES[tonality]["Chord tones"];

  return (
    <figure className="my-5">
      <div className="neck-frame" style={{ ["--accent" as string]: palette.shapes[position.name] }}>
        <Fretboard
          position={position}
          positions={positions}
          root={root}
          tonality={tonality}
          intervals={intervals}
          zoom={zoom}
          labels={labels}
          allShapes={allShapes}
          rootMap={rootMap}
          showScale={showScale}
          chord={chord}
          palette={palette}
        />
      </div>
      {caption ? <figcaption className="mt-2 text-[13px] leading-relaxed text-bone-dim">{caption}</figcaption> : null}
    </figure>
  );
}
