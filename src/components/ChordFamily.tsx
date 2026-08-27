"use client";

import ChordBox from "@/components/ChordBox";
import Panel from "@/components/Panel";
import { chordFamily } from "@/lib/family";
import { buildPositions } from "@/lib/music";
import { pickPosition } from "@/lib/grips";
import type { Tonality } from "@/lib/music";

/**
 * The seven chords a key is built from, with the ones this song uses marked.
 *
 * Worth having next to a chart because it answers the question the chart
 * raises: these four chords, where do they come from and what else was
 * available? A song usually lives inside the family, and the two or three
 * degrees it leaves alone are as much a part of its character as the ones it
 * uses.
 */
export default function ChordFamily({
  root,
  tonality,
  numbering,
  used = [],
}: {
  root: number;
  tonality: Tonality;
  numbering: { root: number; steps: Tonality };
  /** Chart tokens the song actually plays, e.g. ["6-", "5", "4"]. */
  used?: string[];
}) {
  const family = chordFamily(root, tonality, numbering);
  const pitchOf = (offset: number) => (root + offset) % 12;
  // A song writing 6-7 is still playing the 6-, so compare on the degree.
  const bare = (token: string) => token.replace(/^([b#]?[1-7])(-|°)?.*$/, "$1$2");
  const plays = new Set(used.filter((token) => token !== "%").map(bare));
  const inKey = new Set(family.map((chord) => bare(chord.token)));
  // A chord the song plays that the key does not contain. Songs borrow all the
  // time, and which one was borrowed is worth knowing: it is usually the
  // moment the song stops sounding like the key it is in.
  const borrowed = [...plays].filter((token) => !inKey.has(token));

  return (
    <Panel
      id="family"
      label="The seven chords of this key"
      aside={
        <span className="text-[13px] text-bone-dim">
          {plays.size
            ? `This song uses ${plays.size - borrowed.length} of them.`
            : "Build a triad on each degree and these fall out."}
        </span>
      }
    >
      <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4 lg:grid-cols-7">
        {family.map((chord) => {
          const inSong = plays.has(bare(chord.token));
          return (
            <li
              key={chord.degree}
              className="flex flex-col gap-0.5 border-t py-2"
              style={{ borderColor: inSong ? "var(--accent)" : "var(--color-line)" }}
            >
              <span className="flex items-baseline gap-1.5">
                <b
                  className="font-mono text-[15px] font-medium"
                  style={{ color: inSong ? "var(--accent)" : "var(--color-bone)" }}
                >
                  {chord.token}
                </b>
                <span className="font-mono text-[12px] text-bone-dim">{chord.roman}</span>
              </span>
              <span className="text-[14px] text-bone">{chord.name}</span>
              {/* Diminished has no CAGED form, so it is named and not drawn. */}
              {chord.quality === "dim" ? (
                <span className="mt-1 text-[12px] leading-snug text-bone-dim">no CAGED shape</span>
              ) : (
                <span className="mt-1">
                  <ChordBox
                    position={
                      pickPosition(
                        buildPositions(pitchOf(chord.offset), chord.quality === "m" ? "minor" : "major"),
                        0,
                      )!
                    }
                    tonality={chord.quality === "m" ? "minor" : "major"}
                  />
                </span>
              )}
              <span className="mt-1 text-[12px] leading-snug text-bone-dim">{chord.job}</span>
            </li>
          );
        })}
      </ul>

      {borrowed.length ? (
        <p className="mt-4 max-w-[70ch] text-[13px] leading-relaxed text-bone-dim">
          It also plays{" "}
          {borrowed.map((token, index) => (
            <span key={token}>
              {index > 0 ? ", " : ""}
              <b className="font-mono font-medium text-bone">{token}</b>
            </span>
          ))}
          , which {borrowed.length === 1 ? "is" : "are"} not in the key. Borrowed chords are normal and often the most
          interesting bar in a song, but it is worth being sure: a minor key written with a major first degree is
          usually a{" "}
          <b className="font-medium text-bone">-</b> that went missing rather than a decision.
        </p>
      ) : null}
    </Panel>
  );
}
