import type { ShapeName } from "./music";

export type ThemePreference = "system" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";

/**
 * The neck is drawn as SVG, so its colours cannot come from CSS custom properties
 * without relying on `fill="var(...)"`, which Safari has been unreliable about.
 * They live here instead and are handed to the component, which also lets the five
 * shape colours differ per theme: the dark set is tuned for a near black board and
 * would wash out completely on a light one.
 */
export type Palette = {
  board: string;
  nut: string;
  fret: string;
  string: string;
  inlay: string;
  /** Background of a ringed dot. */
  dotFill: string;
  /** A scale tone's ring. Carries meaning, so it clears 3:1 on the board. */
  scaleRing: string;
  /** Text sitting on a filled dot. */
  onAccent: string;
  /** Fret numbers, string names, and unclaimed notes. */
  dim: string;
  shapes: Record<ShapeName, string>;
};

export const PALETTES: Record<ResolvedTheme, Palette> = {
  dark: {
    board: "#241E1A",
    nut: "#E4DCCB",
    fret: "#4A3F37",
    string: "#5C5044",
    inlay: "#3E342C",
    dotFill: "#241E1A",
    scaleRing: "#7A6B5C",
    onAccent: "#12100E",
    dim: "#948A7D",
    shapes: { C: "#B48CFF", A: "#4FC7A1", G: "#FF8A5B", E: "#6FA8FF", D: "#F0C24B" },
  },
  light: {
    board: "#E3D9C8",
    nut: "#3E342C",
    fret: "#A99680",
    string: "#8A7B69",
    inlay: "#CBBCA4",
    dotFill: "#FBF8F2",
    scaleRing: "#877866",
    onAccent: "#FFFFFF",
    dim: "#655B4E",
    shapes: { C: "#6B3FBF", A: "#146B52", G: "#9B3F18", E: "#2559B8", D: "#6E5400" },
  },
};

export function paletteFor(theme: ResolvedTheme): Palette {
  return PALETTES[theme];
}
