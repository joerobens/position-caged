"use client";

import { useState } from "react";
import { HandTap } from "@phosphor-icons/react";

/**
 * The parts of the lesson a fretboard cannot draw. They are the difference between
 * the right notes and the right sound, so they are worth keeping in front of you
 * even though the neck has nothing to say about them.
 */
const FRILLS = [
  ["Left hand", "Hammer on and pull off into the target rather than picking it. A quick grace note just before it sells the whole phrase."],
  ["Right hand", "Rake up into a note across the muted strings. It is most of what makes a blues line sound played rather than typed."],
  ["Dynamics", "Loud, quiet, loud. Playing everything at one volume is the clearest tell that someone is running a pattern."],
  ["Tone", "Change pickup between phrases. Ten minutes on one pickup goes stale however good the notes are."],
  ["Fingers", "Pick the low note, pluck the high one with your middle finger, skip the middle note. It does not sound like a pick and it cannot be faked with one."],
];

export default function TechniqueNote() {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-line bg-ink/40 p-3">
      <button
        type="button"
        className="flex w-full items-center gap-2 text-left text-[13px] text-bone-dim"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <HandTap size={16} weight="bold" />
        <span>
          The neck can show you the notes. It cannot show you these {open ? "" : "— five of them"}.
        </span>
        <span className="ml-auto font-mono text-xs opacity-70">{open ? "hide" : "show"}</span>
      </button>
      {open ? (
        <dl className="mt-3 flex flex-col gap-2.5 border-t border-line pt-3">
          {FRILLS.map(([name, detail]) => (
            <div key={name} className="flex flex-col gap-0.5">
              <dt className="label">{name}</dt>
              <dd className="m-0 text-[13px] leading-relaxed text-bone-dim">{detail}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </div>
  );
}
