"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLibrary } from "@/hooks/useLibrary";
import { nextSetId, saveSet } from "@/lib/songStore";

export default function SetIndex() {
  const library = useLibrary();
  const router = useRouter();
  const [name, setName] = useState("");

  const create = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const id = nextSetId(library);
    saveSet({ id, name: trimmed, slugs: [] });
    router.push(`/sets/${id}`);
  };

  return (
    <>
      {library.sets.length === 0 ? (
        <p className="mt-5 rounded-xl border border-line bg-panel p-4 text-[13px] leading-relaxed text-bone-dim">
          No sets yet. Name one below and start adding songs to it.
        </p>
      ) : (
        <ul className="mt-5 overflow-hidden rounded-xl border border-line">
          {library.sets.map((set) => (
            <li key={set.id} className="border-b border-line last:border-b-0">
              <Link
                href={`/sets/${set.id}`}
                className="flex flex-wrap items-center gap-x-4 gap-y-1 bg-panel px-4 py-3 transition-colors hover:bg-board"
              >
                <b className="flex-1 text-[15px] font-medium">{set.name}</b>
                <span className="font-mono text-[12px] text-bone-dim">
                  {set.slugs.length} song{set.slugs.length === 1 ? "" : "s"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <div className="panel mt-5">
        <span className="label">New set</span>
        <div className="mt-2 flex flex-wrap gap-2">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && create()}
            placeholder="Friday at the pub"
            aria-label="Set name"
            className="min-h-11 flex-1 rounded-[10px] border border-line bg-ink px-3 text-sm text-bone outline-none placeholder:text-bone-dim focus-visible:border-bone-dim"
          />
          <button
            type="button"
            className="chip"
            disabled={!name.trim()}
            style={{ opacity: name.trim() ? 1 : 0.4 }}
            onClick={create}
          >
            Make it
          </button>
        </div>
      </div>
    </>
  );
}
