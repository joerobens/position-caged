"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useLibrary } from "@/hooks/useLibrary";
import { useSettings } from "@/hooks/useSettings";
import { DRILLS } from "@/lib/drills";
import { KEYS } from "@/lib/music";
import { findSong } from "@/lib/songStore";
import { clockFor, topicOf } from "@/lib/topics";

function Row({ what, title, meta, children }: { what: string; title: ReactNode; meta: string; children: ReactNode }) {
  return (
    <li className="grid grid-cols-1 items-center gap-x-6 gap-y-3 rounded-2xl border border-line bg-panel px-5 py-5 sm:grid-cols-[110px_1fr_auto] sm:px-6">
      <span className="text-[14px] text-bone-dim">{what}</span>
      <div className="min-w-0">
        <div className="truncate text-[24px] font-medium leading-tight tracking-tight">{title}</div>
        <div className="mt-1 truncate text-[14px] text-bone-dim">{meta}</div>
      </div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </li>
  );
}

/**
 * The page the Home Screen icon opens on. Three ways back in: what you were
 * practising, the song you last opened, and your latest set, ready to start.
 * Everything is read from this device, so it works with no connection.
 */
export default function Resume() {
  const { settings, hydrated } = useSettings();
  const library = useLibrary();

  const topic = topicOf(settings.topic);
  const drilling = clockFor(settings.topic, settings.clock) === "drill";
  const drill = DRILLS.find((entry) => entry.id === settings.drill);
  const practiceTitle =
    settings.topic === "fingers" ? topic.label : `${topic.label} · ${KEYS[settings.root]} ${settings.tonality}`;
  const practiceMeta = drilling ? `Drill · ${drill?.name ?? "the clock"} · ${settings.bpm} bpm` : "Explore";

  const song = settings.lastSong ? findSong(library, settings.lastSong) : undefined;
  const words = song ? Boolean(library.lyrics[song.slug]?.trim()) : false;

  // The set you touched last, which is the one you are most likely to be playing.
  const set = [...library.sets].sort(
    (a, b) => (library.touched[`sets:${b.id}`] ?? 0) - (library.touched[`sets:${a.id}`] ?? 0),
  )[0];
  const opener = set ? findSong(library, set.slugs[0] ?? "") : undefined;

  return (
    <main
      className="mx-auto w-full max-w-[1080px] px-[var(--gutter)] py-8 pb-16"
      style={{ visibility: hydrated ? "visible" : "hidden" }}
    >
      <h1 className="text-[15px] font-medium text-bone-dim">Pick up where you left off</h1>
      <ul className="mt-4 flex flex-col gap-3">
        <Row what="Practice" title={practiceTitle} meta={practiceMeta}>
          <Link href="/practice" className="btn btn-primary">
            Carry on
          </Link>
        </Row>

        {song ? (
          <Row what="Last song" title={song.title} meta={`${song.credit} · ${KEYS[song.root]} ${song.tonality}${words ? " · chart and words" : " · chart"}`}>
            <Link href={`/songs/${song.slug}`} className="btn">
              Open
            </Link>
          </Row>
        ) : (
          <Row what="Songs" title="Your songs" meta={`${library.own.length} in the library`}>
            <Link href="/songs" className="btn">
              Open the library
            </Link>
          </Row>
        )}

        {set ? (
          <Row
            what="Latest set"
            title={set.name}
            meta={`${set.slugs.length} song${set.slugs.length === 1 ? "" : "s"}${opener ? ` · starts with ${opener.title}` : ""}`}
          >
            <Link href={`/sets/${set.id}`} className="btn btn-quiet">
              Edit
            </Link>
            {opener ? (
              <Link href={`/songs/${opener.slug}/stand?set=${set.id}`} className="btn btn-primary">
                Start the set
              </Link>
            ) : null}
          </Row>
        ) : (
          <Row what="Sets" title="No sets yet" meta="Songs in an order, for playing straight through">
            <Link href="/sets" className="btn">
              Make a set
            </Link>
          </Row>
        )}
      </ul>
    </main>
  );
}
