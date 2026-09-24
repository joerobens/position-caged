"use client";

import Link from "next/link";
import { Check, Plus } from "@phosphor-icons/react";
import Popover from "@/components/Popover";
import { useLibrary } from "@/hooks/useLibrary";
import { saveSet } from "@/lib/songStore";
import { ICON } from "@/lib/icons";

/** Put this song on the end of a set, from the song itself rather than from the set. */
export default function AddToSet({ slug }: { slug: string }) {
  const library = useLibrary();
  const holding = library.sets.filter((set) => set.slugs.includes(slug)).length;

  return (
    <Popover
      label="Add to a set"
      buttonClassName="bg-board text-sm font-medium"
      button={() => (
        <>
          <Plus size={ICON.sm} weight="bold" />
          Add to a set
          {holding ? <span className="font-mono text-[12px] text-bone-dim">in {holding}</span> : null}
        </>
      )}
    >
      {library.sets.length ? (
        <ul className="flex flex-col gap-1.5">
          {library.sets.map((set) => {
            const inIt = set.slugs.includes(slug);
            return (
              <li key={set.id}>
                <button
                  type="button"
                  className="chip flex w-full items-center justify-between gap-3 text-left disabled:opacity-100"
                  disabled={inIt}
                  onClick={() => saveSet({ ...set, slugs: [...set.slugs, slug] })}
                >
                  <span className="truncate">{set.name}</span>
                  <span className="flex flex-none items-center gap-1.5 text-[12px] text-bone-dim">
                    {inIt ? (
                      <>
                        <Check size={ICON.sm} weight="bold" />
                        in it, number {set.slugs.indexOf(slug) + 1}
                      </>
                    ) : (
                      `${set.slugs.length} song${set.slugs.length === 1 ? "" : "s"}`
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <span className="text-[13px] text-bone-dim">No sets yet.</span>
      )}
      <Link href="/sets" className="text-[13px] text-bone underline decoration-line underline-offset-4">
        Make a new set
      </Link>
    </Popover>
  );
}
