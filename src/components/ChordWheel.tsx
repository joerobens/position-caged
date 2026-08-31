"use client";

import { useSettings } from "@/hooks/useSettings";
import { useTheme } from "@/hooks/useTheme";
import { paletteFor } from "@/lib/theme";
import type { Tonality } from "@/lib/music";
import { RING, familyOn, positionOf } from "@/lib/wheel";

/**
 * The chord family as a wheel.
 *
 * Twelve keys around the outside, a fifth apart, each with its relative minor
 * directly inside it. A key's six chords are then three touching slices rather
 * than a list, which is the thing the diagram is for: you can see that F, C and
 * G go together because they are neighbours, and that turning one notch gives
 * you the same six shapes a fifth up.
 */
const SIZE = 320;
const MID = SIZE / 2;
const R = { outer: 152, seam: 108, inner: 62 };

/*
 * Rounded, and deliberately.
 *
 * Sine and cosine are not required to be correctly rounded, so the server and
 * the browser can disagree in the last bit: one writes 44.48849427774749 into
 * the HTML and the other computes 44.488494277747506, and React calls that a
 * hydration mismatch. Two decimals is far finer than a 320 unit circle can
 * show and leaves nothing for them to disagree about.
 */
const round = (value: number) => Math.round(value * 100) / 100;

const point = (angle: number, radius: number) => {
  const radians = ((angle - 90) * Math.PI) / 180;
  return [round(MID + radius * Math.cos(radians)), round(MID + radius * Math.sin(radians))];
};

/** One segment of a ring, as a path. */
function sector(at: number, from: number, to: number) {
  const start = at * 30 - 15;
  const end = at * 30 + 15;
  const [x1, y1] = point(start, to);
  const [x2, y2] = point(end, to);
  const [x3, y3] = point(end, from);
  const [x4, y4] = point(start, from);
  return `M ${x1} ${y1} A ${to} ${to} 0 0 1 ${x2} ${y2} L ${x3} ${y3} A ${from} ${from} 0 0 0 ${x4} ${y4} Z`;
}

export default function ChordWheel({
  root,
  tonality,
  onPick,
}: {
  root: number;
  tonality: Tonality;
  /** Turning the wheel, or tapping any chord on it, chooses a key. */
  onPick: (root: number, tonality: Tonality) => void;
}) {
  const { settings } = useSettings();
  const resolved = useTheme(settings.theme);
  const palette = paletteFor(resolved);

  const home = positionOf(root, tonality);
  const family = familyOn(home);
  const inFamily = new Map(family.map((chord) => [`${chord.at}:${chord.ring}`, chord]));

  const label = (at: number, ring: "major" | "minor") => {
    const slice = RING[at];
    return ring === "major" ? slice.majorName : slice.minorName;
  };

  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      className="w-full max-w-[320px]"
      role="group"
      aria-label="Chord family wheel"
    >
      {(["major", "minor"] as const).map((ring) =>
        RING.map((slice) => {
          const key = `${slice.at}:${ring}`;
          const chord = inFamily.get(key);
          const isHome = chord?.roman === (tonality === "minor" ? "vi" : "I");
          const [from, to] = ring === "major" ? [R.seam, R.outer] : [R.inner, R.seam];
          // Name and degree get their own radius rather than fighting over one:
          // a segment is a wedge, so "above" and "below" are further out and
          // further in, not up and down.
          // Explicit radii, far enough apart that the two never touch. The
          // ring is forty four across, the two labels want about twenty five
          // of it, so there is room provided they are actually placed.
          const nameAt = ring === "major" ? 138 : 94;
          const romanAt = ring === "major" ? 117 : 73;
          const [tx, ty] = point(slice.at * 30, nameAt);
          const [rx, ry] = point(slice.at * 30, romanAt);
          const pitch = ring === "major" ? slice.major : slice.minor;

          return (
            <g key={key}>
              <path
                d={sector(slice.at, from, to)}
                fill={isHome ? "var(--accent)" : chord ? palette.board : palette.dotFill}
                stroke={palette.fret}
                strokeWidth={1}
                opacity={chord ? 1 : 0.4}
                style={{ cursor: "pointer" }}
                onClick={() => onPick(pitch, ring === "major" ? "major" : "minor")}
                role="button"
                aria-label={`${label(slice.at, ring)}${chord ? `, the ${chord.roman} of this key` : ""}`}
              />
              <text
                x={tx}
                y={ty + 4}
                textAnchor="middle"
                pointerEvents="none"
                className="fb-dot"
                fill={isHome ? "var(--on-accent)" : chord ? palette.nut : palette.dim}
                fontSize={ring === "major" ? 14 : 12}
                fontWeight={chord ? 500 : 400}
              >
                {label(slice.at, ring)}
              </text>
              {chord ? (
                <text
                  x={rx}
                  y={ry + 3}
                  textAnchor="middle"
                  pointerEvents="none"
                  className="fb-mark"
                  fill={isHome ? "var(--on-accent)" : palette.dim}
                  fontSize={9.5}
                >
                  {chord.roman}
                </text>
              ) : null}
            </g>
          );
        }),
      )}
    </svg>
  );
}
