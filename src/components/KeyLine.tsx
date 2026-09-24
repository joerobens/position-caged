"use client";

import { CaretDown } from "@phosphor-icons/react";
import Popover from "@/components/Popover";
import { KEYS, type Tonality } from "@/lib/music";
import { shapeRoot } from "@/lib/nashville";
import { effectiveCapo, needsRetune, tuningOf } from "@/lib/tunings";
import { ICON } from "@/lib/icons";

const shapes = (root: number, tonality: Tonality) => `${KEYS[root]}${tonality === "minor" ? "m" : ""} shapes`;

/**
 * The key, said the way your hands need it: the shapes you hold and where the
 * capo goes first, and what that sounds as second. Tapping it plays the song in
 * another key, for now or for keeps.
 */
export default function KeyLine({
  written,
  root,
  capo,
  tonality,
  tuning,
  onChange,
  onKeep,
}: {
  /** The key and capo the song is saved in. */
  written: { root: number; capo: number };
  /** The key it sounds in right now, and the capo it is played with. */
  root: number;
  capo: number;
  tonality: Tonality;
  tuning?: string;
  onChange: (root: number, capo: number) => void;
  /** Save the key and capo showing now as the song's own. */
  onKeep: () => void;
}) {
  const held = effectiveCapo(capo, tuning);
  const retuned = needsRetune(tuning);
  const moved = root !== written.root || capo !== written.capo;
  const plain = held === 0 && !retuned;
  // With a capo on, the same sound can usually be had without one, in the open.
  const open = capo > 0 ? effectiveCapo(0, tuning) : null;

  return (
    <Popover
      label={`Key: ${KEYS[root]} ${tonality}. Play it in another key`}
      buttonClassName="min-h-12 gap-3 py-1.5"
      button={(isOpen) => (
        <>
          <b className="text-[20px] font-medium tracking-tight">
            {plain
              ? `${KEYS[root]} ${tonality}`
              : `${shapes(shapeRoot(root, held), tonality)}${capo ? ` · capo ${capo}` : ""}${retuned ? ` · ${tuningOf(tuning).label}` : ""}`}
          </b>
          {plain ? null : (
            <span className="text-[15px] text-bone-dim">
              sounds {KEYS[root]} {tonality}
            </span>
          )}
          <CaretDown size={ICON.sm} weight="bold" className="text-bone-dim" style={{ transform: isOpen ? "rotate(180deg)" : undefined }} />
        </>
      )}
    >
      {(close) => (
        <>
          <span className="label">Play it in</span>
          <div role="group" aria-label="Play it in" className="grid grid-cols-6 gap-1.5">
            {KEYS.map((name, index) => (
              <button
                key={name}
                type="button"
                className="chip px-0"
                aria-pressed={index === root}
                onClick={() => onChange(index, capo)}
              >
                {name}
              </button>
            ))}
          </div>
          {open !== null ? (
            <p className="text-[14px] leading-relaxed text-bone-dim">
              Sounds {KEYS[root]} {tonality}: {shapes(shapeRoot(root, held), tonality)} at capo {capo}, or{" "}
              <button
                type="button"
                className="font-medium text-bone underline decoration-line underline-offset-4"
                onClick={() => onChange(root, 0)}
              >
                {shapes(shapeRoot(root, open), tonality)} with no capo
              </button>
              .
            </p>
          ) : written.capo > 0 && capo === 0 ? (
            <p className="text-[14px] leading-relaxed text-bone-dim">
              Playing it without the capo.{" "}
              <button
                type="button"
                className="font-medium text-bone underline decoration-line underline-offset-4"
                onClick={() => onChange(root, written.capo)}
              >
                Capo {written.capo} again
              </button>
            </p>
          ) : null}
          {moved ? (
            <>
              <div className="flex flex-wrap items-center gap-2 border-t border-line pt-3">
                <button
                  type="button"
                  className="btn btn-quiet"
                  onClick={() => {
                    onChange(written.root, written.capo);
                    close();
                  }}
                >
                  Back to {KEYS[written.root]}, as written
                </button>
                <button type="button" className="btn ml-auto" onClick={close}>
                  Just for now
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    onKeep();
                    close();
                  }}
                >
                  Keep this key
                </button>
              </div>
              <span className="text-[13px] text-bone-dim">
                Keep this key changes the song everywhere. A set can still play it in its own key.
              </span>
            </>
          ) : null}
        </>
      )}
    </Popover>
  );
}
