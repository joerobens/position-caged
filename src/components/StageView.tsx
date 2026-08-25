"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, CaretLeft, CaretRight, Minus, Plus } from "@phosphor-icons/react";
import { useLibrary } from "@/hooks/useLibrary";
import { useSettings } from "@/hooks/useSettings";
import { useTheme } from "@/hooks/useTheme";
import { useWakeLock } from "@/hooks/useWakeLock";
import { findSet, findSong } from "@/lib/songStore";
import { KEYS } from "@/lib/music";
import { effectiveCapo, needsRetune, tuningOf } from "@/lib/tunings";
import { chordName, numberingOf, parseChord, shapeRoot } from "@/lib/nashville";
import { ICON } from "@/lib/icons";

const MIN_SIZE = 18;
const MAX_SIZE = 56;

/**
 * The view you actually use: guitar in your hands, iPad on a stand, a metre away.
 * No site chrome, type big enough to read from there, the chart pinned where you
 * can glance at it, and the screen kept awake.
 */
export default function StageView({ slug }: { slug: string }) {
  const library = useLibrary();
  const { settings, update } = useSettings();
  const router = useRouter();
  const params = useSearchParams();
  useTheme(settings.theme);
  useWakeLock(true);
  const [chartOpen, setChartOpen] = useState(true);

  const song = findSong(library, slug);
  const lyrics = library.lyrics[slug] ?? "";

  // Opened from a set, the stand knows where it is in the running order.
  const set = findSet(library, params.get("set") ?? "");
  const at = set ? set.slugs.indexOf(slug) : -1;
  const previous = set && at > 0 ? set.slugs[at - 1] : null;
  const next = set && at >= 0 && at < set.slugs.length - 1 ? set.slugs[at + 1] : null;

  const go = useCallback(
    (target: string | null) => {
      if (target && set) router.push(`/songs/${target}/play?set=${set.id}`);
    },
    [router, set],
  );

  /*
   * Left and right move through the set. A Bluetooth page turner sends exactly
   * these, which is the only way to change song with both hands on the guitar.
   * Up and down are left alone so the pedal can still scroll a long song.
   */
  useEffect(() => {
    if (!set) return;
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
      if (event.key === "ArrowRight" || event.key === "PageDown") {
        event.preventDefault();
        go(next);
      }
      if (event.key === "ArrowLeft" || event.key === "PageUp") {
        event.preventDefault();
        go(previous);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [set, next, previous, go]);

  if (!song) {
    return (
      <main className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 p-8 text-center">
        <p className="text-[15px] text-bone-dim">Nothing in the library has the slug {slug}.</p>
        <Link href="/songs" className="chip">
          Back to songs
        </Link>
      </main>
    );
  }

  const numbering = numberingOf(song);
  // On a stand you need the shape under your fingers, not the concert pitch.
  const playRoot = shapeRoot(numbering.root, effectiveCapo(song.capo, song.tuning));
  const inTuning = tuningOf(song.tuning).id;
  const size = Math.min(MAX_SIZE, Math.max(MIN_SIZE, settings.lyricSize));
  const resize = (delta: number) => update({ lyricSize: Math.min(MAX_SIZE, Math.max(MIN_SIZE, size + delta)) });

  return (
    <main className="flex min-h-[100dvh] flex-col">
      {/* everything you might need mid-song, in one strip that never moves */}
      <header className="sticky top-0 z-20 flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line bg-ink px-[var(--gutter)] pb-2 pt-[max(8px,env(safe-area-inset-top))]">
        <Link
          href={set ? `/sets/${set.id}` : `/songs/${slug}`}
          aria-label="Leave the stand"
          className="chip flex flex-none items-center px-3"
        >
          <ArrowLeft size={ICON.sm} weight="bold" />
        </Link>
        <span className="truncate text-[15px] font-medium">{song.title}</span>
        {set ? (
          <span className="flex-none font-mono text-[12px] text-bone-dim">
            {set.name} · {at + 1} of {set.slugs.length}
          </span>
        ) : null}
        {needsRetune(song.tuning) ? (
          <span className="flex-none rounded-[6px] bg-bone px-2 py-0.5 font-mono text-[12px] font-medium text-ink">
            {tuningOf(song.tuning).label}
          </span>
        ) : null}
        <span className="font-mono text-[13px] text-bone-dim">
          {effectiveCapo(song.capo, song.tuning)
            ? `${song.capo ? `capo ${song.capo} · ` : ""}${KEYS[shapeRoot(song.root, effectiveCapo(song.capo, song.tuning))]} shapes · sounds ${KEYS[song.root]}`
            : `${song.capo ? `capo ${song.capo} · ` : ""}${KEYS[song.root]} ${song.tonality}`}
        </span>
        <div className="ml-auto flex flex-none items-center gap-2">
          <button type="button" className="chip px-3" aria-label="Smaller text" onClick={() => resize(-3)}>
            <Minus size={ICON.sm} weight="bold" />
          </button>
          <span className="w-9 text-center font-mono text-[12px] text-bone-dim">{size}</span>
          <button type="button" className="chip px-3" aria-label="Bigger text" onClick={() => resize(3)}>
            <Plus size={ICON.sm} weight="bold" />
          </button>
          <button type="button" className="chip" aria-pressed={chartOpen} onClick={() => setChartOpen((open) => !open)}>
            Chart
          </button>
        </div>
      </header>

      {chartOpen ? (
        <div className="border-b border-line px-[var(--gutter)] py-2">
          {song.chart.map((section, sectionIndex) => (
            <div key={sectionIndex} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 py-1">
              <span className="label w-16 flex-none">{section.name}</span>
              <div className="flex flex-wrap gap-1.5">
                {section.bars.map((bar, index) => {
                  const token = parseChord(bar, numbering.steps);
                  return (
                    <span
                      key={index}
                      className="min-w-[52px] rounded-md border border-line px-2 py-1 text-center font-mono text-[14px] font-medium"
                    >
                      {token && !token.hold ? chordName(token, playRoot) : bar}
                    </span>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {lyrics ? (
        <div className="flex-1 px-[var(--gutter)] py-4 pb-[max(24px,env(safe-area-inset-bottom))]">
          {/* Two columns once there is width for them, so a short song needs no scrolling at all. */}
          <pre
            className="whitespace-pre-wrap font-[family-name:var(--font-display)] text-bone lg:columns-2 lg:gap-10"
            style={{ fontSize: `${size}px`, lineHeight: 1.5 }}
          >
            {lyrics}
          </pre>
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
          <p className="max-w-[46ch] text-[15px] leading-relaxed text-bone-dim">
            No words for this one yet. Add them on the song page and they will be here, large enough to read from the
            stand.
          </p>
          <Link href={`/songs/${slug}`} className="chip">
            Add the words
          </Link>
        </div>
      )}
      {set ? (
        <nav
          className="sticky bottom-0 z-20 flex items-stretch gap-2 border-t border-line bg-ink px-[var(--gutter)] pb-[max(8px,env(safe-area-inset-bottom))] pt-2"
          aria-label="Set"
        >
          <button
            type="button"
            className="chip flex min-h-14 flex-1 items-center justify-center gap-2"
            disabled={!previous}
            style={{ opacity: previous ? 1 : 0.3 }}
            onClick={() => go(previous)}
          >
            <CaretLeft size={ICON.md} weight="bold" />
            <span className="truncate text-[13px]">{previous ? songTitle(previous) : "Start of the set"}</span>
          </button>
          <button
            type="button"
            className="chip flex min-h-14 flex-1 items-center justify-center gap-2"
            disabled={!next}
            style={{ opacity: next ? 1 : 0.3 }}
            onClick={() => go(next)}
          >
            <span className="flex min-w-0 flex-col items-center leading-tight">
              <span className="truncate text-[13px]">{next ? songTitle(next) : "End of the set"}</span>
              {retuneFor(next) ? (
                <span className="mt-0.5 truncate rounded-[5px] bg-bone px-1.5 font-mono text-[11px] font-medium text-ink">
                  retune {retuneFor(next)}
                </span>
              ) : null}
            </span>
            <CaretRight size={ICON.md} weight="bold" />
          </button>
        </nav>
      ) : null}
    </main>
  );

  function songTitle(target: string) {
    return findSong(library, target)?.title ?? target;
  }

  /** The tuning the next song wants, when it is not the one you are already in. */
  function retuneFor(target: string | null) {
    if (!target) return null;
    const coming = findSong(library, target);
    if (!coming) return null;
    const to = tuningOf(coming.tuning);
    return to.id === inTuning ? null : to.label;
  }
}
