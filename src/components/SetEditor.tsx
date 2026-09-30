"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowsDownUp, DotsSixVertical, Play, Plus, X } from "@phosphor-icons/react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { restrictToParentElement, restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { CSS } from "@dnd-kit/utilities";
import { useLibrary } from "@/hooks/useLibrary";
import { allSongs, findSet, keyInSet, removeSet, saveSet, type SetList } from "@/lib/songStore";
import { SET_SORTS, retunes, sortSet, type SetSort } from "@/lib/setSort";
import Popover from "@/components/Popover";
import { KEYS } from "@/lib/music";
import { tuningOf } from "@/lib/tunings";
import type { Song } from "@/lib/songs";
import { ICON } from "@/lib/icons";

/** One song in the running order, with a grip to drag it by. */
function Row({
  set,
  song,
  index,
  retune,
  tuning,
  hasWords,
  onRemove,
}: {
  set: SetList;
  song: Song;
  index: number;
  /** The tuning to change to before this song, when it differs from the one before. */
  retune: string | null;
  /** Its tuning, when that is not standard, so a run of them reads as one. */
  tuning: string | null;
  hasWords: boolean;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: song.slug,
  });
  const played = keyInSet(set, song);

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`relative flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-line bg-panel px-2 py-2 last:border-b-0 ${
        isDragging ? "z-10 rounded-xl shadow-lg shadow-black/40 ring-1 ring-bone-dim" : ""
      }`}
    >
      {/* The grip is the only thing that drags, so scrolling the list never moves a song. */}
      <button
        ref={setActivatorNodeRef}
        type="button"
        aria-label={`Move ${song.title}. Drag, or press space then the arrow keys`}
        className="flex size-11 flex-none cursor-grab touch-none items-center justify-center rounded-[10px] text-bone-dim hover:text-bone active:cursor-grabbing focus-visible:outline focus-visible:outline-2 focus-visible:outline-bone"
        {...attributes}
        {...listeners}
      >
        <DotsSixVertical size={ICON.md} weight="bold" />
      </button>
      <span className="w-6 flex-none text-center font-mono text-[13px] text-bone-dim">{index + 1}</span>
      {/* Picking the set up partway, after a break or a false start. */}
      <Link
        href={`/songs/${song.slug}/stand?set=${set.id}`}
        aria-label={`Start the set from ${song.title}`}
        className="btn btn-quiet size-11 flex-none px-0"
      >
        <Play size={ICON.sm} weight="fill" />
      </Link>
      <Link href={`/songs/${song.slug}`} className="min-w-0 flex-1 truncate text-[15px] font-medium hover:text-bone-dim">
        {song.title}
      </Link>
      {retune ? (
        <span className="flex-none rounded-[5px] bg-bone px-1.5 py-0.5 font-mono text-[12px] font-medium text-ink">
          ↻ {retune}
        </span>
      ) : tuning ? (
        <span className="flex-none rounded-[5px] border border-line px-1.5 py-0.5 font-mono text-[12px] text-bone-dim">{tuning}</span>
      ) : null}
      {song.capo ? <span className="flex-none font-mono text-[12px] text-bone-dim">capo {song.capo}</span> : null}
      {hasWords ? null : <span className="flex-none font-mono text-[12px] text-bone-dim">no words</span>}
      {/* The key for this gig, which can differ from the key it is written in. */}
      <Popover
        label={`${song.title}: played in ${KEYS[played]}. Change it for this set`}
        className="left-auto right-0"
        buttonClassName="min-h-11 border-transparent bg-transparent px-2.5 text-[13px]"
        button={() => (
          <span className="flex items-baseline gap-1.5">
            <span className={played === song.root ? "text-bone-dim" : "font-medium text-bone"}>
              {KEYS[played]} {song.tonality}
            </span>
            {played === song.root ? null : <span className="font-mono text-[11px] text-bone-dim">written {KEYS[song.root]}</span>}
          </span>
        )}
      >
        {(close) => (
          <>
            <span className="label">Play it in, for this set</span>
            <div role="group" aria-label={`Key for ${song.title}`} className="grid grid-cols-6 gap-1.5">
              {KEYS.map((name, root) => (
                <button
                  key={name}
                  type="button"
                  className="chip px-0"
                  aria-pressed={root === played}
                  onClick={() => {
                    const keys = { ...set.keys };
                    if (root === song.root) delete keys[song.slug];
                    else keys[song.slug] = root;
                    saveSet({ ...set, keys });
                    close();
                  }}
                >
                  {name}
                </button>
              ))}
            </div>
            <span className="text-[13px] text-bone-dim">Written in {KEYS[song.root]}. The chart follows.</span>
          </>
        )}
      </Popover>
      {/* Set apart, and undoable, because it is the one that loses something. */}
      <button
        type="button"
        className="btn btn-quiet ml-2 size-11 flex-none px-0"
        aria-label={`Take ${song.title} out`}
        onClick={onRemove}
      >
        <X size={ICON.sm} weight="bold" />
      </button>
    </li>
  );
}

export default function SetEditor({ id }: { id: string }) {
  const library = useLibrary();
  const router = useRouter();
  const set = findSet(library, id);
  const [adding, setAdding] = useState(false);
  const [confirming, setConfirming] = useState(false);
  // The order as it was before the last thing that changed it wholesale, so it
  // can be put back: taking a song out, or a sort.
  const [undo, setUndo] = useState<{ message: string; slugs: string[] } | null>(null);
  const sensors = useSensors(
    // A small movement before it counts as a drag, so a tap on the grip is still a tap.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  if (!set) {
    return (
      <main className="mx-auto w-full max-w-[1180px] px-[var(--gutter)] py-10">
        <h1 className="text-[20px] font-medium">No set here</h1>
        <p className="mt-2 max-w-[60ch] text-[14px] leading-relaxed text-bone-dim">
          It may have been deleted, or made on a device that is not signed in to the same account.
        </p>
        <Link href="/sets" className="btn mt-4 inline-flex">
          Back to sets
        </Link>
      </main>
    );
  }

  const songs = allSongs(library);
  const inSet = set.slugs.map((slug) => songs.find((song) => song.slug === slug)).filter((song): song is Song => Boolean(song));
  const available = songs.filter((song) => !set.slugs.includes(song.slug));
  const first = set.slugs[0];
  const retuneCount = retunes(set.slugs, songs);

  const reorder = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = set.slugs.indexOf(String(active.id));
    const to = set.slugs.indexOf(String(over.id));
    saveSet({ ...set, slugs: arrayMove(set.slugs, from, to) });
    setUndo(null);
  };

  const sortBy = (by: SetSort) => {
    const slugs = sortSet(set, songs, by);
    if (slugs.join() === set.slugs.join()) return;
    setUndo({ message: `Sorted by ${SET_SORTS.find((sort) => sort.value === by)!.label.toLowerCase()}.`, slugs: set.slugs });
    saveSet({ ...set, slugs });
  };

  return (
    <main className="mx-auto w-full max-w-[1180px] px-[var(--gutter)] py-7 pb-16">
      <Link href="/sets" className="-my-2 inline-flex min-h-11 items-center text-[13px] text-bone-dim hover:text-bone">
        &larr; Sets
      </Link>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <input
          value={set.name}
          onChange={(event) => saveSet({ ...set, name: event.target.value })}
          aria-label="Set name"
          className="min-w-0 flex-1 rounded-[10px] border border-transparent bg-transparent text-[24px] font-medium tracking-tight text-bone outline-none hover:border-line focus-visible:border-bone-dim"
        />
      </div>

      {/* Everything you can do to this set, in one place. */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {first ? (
          <Link href={`/songs/${first}/stand?set=${set.id}`} className="btn btn-primary">
            Start the set
          </Link>
        ) : null}
        <button type="button" className="btn" onClick={() => setAdding((open) => !open)}>
          {adding ? null : <Plus size={ICON.sm} weight="bold" />}
          {adding ? "Done adding" : "Add from the library"}
        </button>
        {inSet.length > 1 ? (
          <Popover
            label="Sort the running order"
            buttonClassName="bg-board text-sm font-medium"
            button={() => (
              <>
                <ArrowsDownUp size={ICON.sm} weight="bold" />
                Sort by
              </>
            )}
          >
            {(close) => (
              <>
                <span className="text-[13px] leading-relaxed text-bone-dim">
                  Sorts once, then it is yours to drag. {retuneCount ? `The order now retunes ${retuneCount} time${retuneCount === 1 ? "" : "s"}.` : "No retunes in the order now."}
                </span>
                <div className="flex flex-col gap-1.5">
                  {SET_SORTS.map((sort) => {
                    const after = sort.value === "tuning" ? retunes(sortSet(set, songs, "tuning"), songs) : null;
                    return (
                      <button
                        key={sort.value}
                        type="button"
                        className="chip flex w-full flex-col items-start gap-0.5 py-2 text-left"
                        onClick={() => {
                          sortBy(sort.value);
                          close();
                        }}
                      >
                        <span className="font-medium">
                          {sort.label}
                          {after !== null && after < retuneCount ? (
                            <span className="ml-2 font-mono text-[12px] text-bone-dim">
                              {retuneCount} → {after} retune{after === 1 ? "" : "s"}
                            </span>
                          ) : null}
                        </span>
                        <span className="text-[12px] text-bone-dim">{sort.hint}</span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </Popover>
        ) : null}
        <button type="button" className="btn btn-quiet ml-auto" onClick={() => setConfirming(true)}>
          Delete this set
        </button>
      </div>

      {confirming ? (
        <div className="panel mt-3 flex flex-wrap items-center gap-3">
          <span className="text-[13px] leading-relaxed text-bone-dim">
            Delete <b className="font-medium text-bone">{set.name}</b>? The songs stay in your library; only the
            running order goes.
          </span>
          <div className="ml-auto flex gap-2">
            <button type="button" className="btn" onClick={() => setConfirming(false)}>
              Keep it
            </button>
            <button
              type="button"
              className="btn btn-quiet"
              onClick={() => {
                removeSet(set.id);
                router.push("/sets");
              }}
            >
              Yes, delete it
            </button>
          </div>
        </div>
      ) : null}

      {undo ? (
        <div role="status" className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-line bg-ink px-4 py-2 text-[14px] text-bone-dim">
          {undo.message}
          <button
            type="button"
            className="btn ml-auto"
            onClick={() => {
              saveSet({ ...set, slugs: undo.slugs });
              setUndo(null);
            }}
          >
            Put the old order back
          </button>
        </div>
      ) : null}

      {inSet.length === 0 ? (
        <p className="mt-5 rounded-xl border border-line bg-panel p-4 text-[13px] leading-relaxed text-bone-dim">
          Nothing in this set yet. Add songs from the library.
        </p>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          modifiers={[restrictToVerticalAxis, restrictToParentElement]}
          onDragEnd={reorder}
        >
          <SortableContext items={set.slugs} strategy={verticalListSortingStrategy}>
            <ol className="mt-4 rounded-xl border border-line">
              {inSet.map((song, index) => {
                const before = index === 0 ? "standard" : tuningOf(inSet[index - 1].tuning).id;
                const tuning = tuningOf(song.tuning);
                return (
                  <Row
                    key={song.slug}
                    set={set}
                    song={song}
                    index={index}
                    retune={tuning.id !== before ? tuning.label : null}
                    tuning={tuning.id === "standard" ? null : tuning.label}
                    hasWords={Boolean(library.lyrics[song.slug]?.trim())}
                    onRemove={() => {
                      setUndo({ message: `Took ${song.title} out.`, slugs: set.slugs });
                      saveSet({ ...set, slugs: set.slugs.filter((slug) => slug !== song.slug) });
                    }}
                  />
                );
              })}
            </ol>
          </SortableContext>
        </DndContext>
      )}

      {adding ? (
        available.length ? (
          <div className="panel mt-4">
            <span className="label">Add to the set</span>
            <ul className="mt-2">
              {available.map((song) => (
                <li key={song.slug} className="border-b border-line last:border-b-0">
                  <button
                    type="button"
                    onClick={() => saveSet({ ...set, slugs: [...set.slugs, song.slug] })}
                    className="flex min-h-11 w-full items-center gap-3 py-2.5 text-left transition-opacity hover:opacity-70 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-bone"
                  >
                    <span className="min-w-0 flex-1 truncate text-[15px]">{song.title}</span>
                    <span className="flex-none text-[13px] text-bone-dim">{song.credit}</span>
                    <span className="flex-none font-mono text-[12px] text-bone-dim">
                      {KEYS[song.root]} {song.tonality}
                    </span>
                    <Plus size={ICON.sm} weight="bold" className="flex-none text-bone-dim" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="mt-4 text-[13px] leading-relaxed text-bone-dim">Every song in the library is already in this set.</p>
        )
      ) : null}
    </main>
  );
}
