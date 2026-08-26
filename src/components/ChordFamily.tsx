"use client";

import { chordFamily } from "@/lib/family";
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
  // A song writing 6-7 is still playing the 6-, so compare on the degree.
  const bare = (token: string) => token.replace(/^([b#]?[1-7])(-|°)?.*$/, "$1$2");
  const plays = new Set(used.map(bare));

  return (
    <section className="panel mt-5" aria-label="The chords of the key">
      <div className="flex flex-wrap items-baseline gap-x-3">
        <span className="label">The seven chords of this key</span>
        <span className="text-[13px] text-bone-dim">
          {plays.size ? `This song uses ${plays.size} of them.` : "Build a triad on each degree and these fall out."}
        </span>
      </div>

      <ul className="mt-3 grid grid-cols-2 gap-x-4 sm:grid-cols-4 lg:grid-cols-7">
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
              <span className="text-[12px] leading-snug text-bone-dim">{chord.job}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
