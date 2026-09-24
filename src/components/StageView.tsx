"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, CaretDown, CaretLeft, CaretRight, Minus, Plus, TextAa } from "@phosphor-icons/react";
import Popover from "@/components/Popover";
import { Segmented, Toggle } from "@/components/controls";
import { useRef } from "react";
import { useLibrary } from "@/hooks/useLibrary";
import { useSettings } from "@/hooks/useSettings";
import { useTheme } from "@/hooks/useTheme";
import { useWakeLock } from "@/hooks/useWakeLock";
import { findSet, findSong, keyInSet } from "@/lib/songStore";
import { KEYS } from "@/lib/music";
import { effectiveCapo, needsRetune, tuningOf } from "@/lib/tunings";
import { chordName, numberingOf, parseChord, shapeRoot } from "@/lib/nashville";
import { ICON } from "@/lib/icons";
import { useFitText } from "@/hooks/useFitText";

const MIN_SIZE = 22;
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
  // Which song the set was finished from. Keyed to the song, so moving clears it.
  const [finishedAt, setFinishedAt] = useState<string | null>(null);
  const finished = finishedAt === slug;

  const song = findSong(library, slug);
  const lyrics = library.lyrics[slug] ?? "";

  const columns = settings.lyricColumns === 1 ? 1 : 2;
  const fit = settings.lyricFit;
  // The box it has to fit inside changes when the chart opens or the iPad turns.
  const { ref: lyricRef, size: fitted, pages } = useFitText<HTMLPreElement>({
    enabled: fit,
    min: MIN_SIZE,
    max: MAX_SIZE,
    deps: [lyrics, columns, chartOpen, fit],
  });
  const [page, setPage] = useState(0);
  const turning = useRef(false);

  // Turning a page moves the columns sideways by exactly one screenful.
  const turn = useCallback((to: number) => {
    const el = lyricRef.current;
    if (!el) return;
    const last = Math.max(0, Math.ceil(el.scrollWidth / el.clientWidth - 0.15) - 1);
    const target = Math.max(0, Math.min(to, last));
    turning.current = true;
    setPage(target);
    // The last page lands on the true end rather than its page boundary, so the
    // final lines are never left sitting just past the edge.
    const left = target >= last ? el.scrollWidth - el.clientWidth : target * el.clientWidth;
    el.scrollTo({ left, behavior: "smooth" });
    window.setTimeout(() => (turning.current = false), 400);
  }, [lyricRef]);

  // A different song, or a different shape of page, starts at the beginning.
  // Adjusted during render rather than in an effect: this is state derived from
  // a changing input, and an effect would render page one of the old song first.
  const shape = `${slug}:${pages}:${columns}`;
  const [lastShape, setLastShape] = useState(shape);
  if (shape !== lastShape) {
    setLastShape(shape);
    setPage(0);
  }
  useEffect(() => {
    const el = lyricRef.current;
    if (el) el.scrollTo({ left: 0 });
  }, [shape, lyricRef]);

  // Opened from a set, the stand knows where it is in the running order.
  const set = findSet(library, params.get("set") ?? "");
  const at = set ? set.slugs.indexOf(slug) : -1;
  const previous = set && at > 0 ? set.slugs[at - 1] : null;
  const next = set && at >= 0 && at < set.slugs.length - 1 ? set.slugs[at + 1] : null;

  const go = useCallback(
    (target: string | null) => {
      if (target && set) router.push(`/songs/${target}/stand?set=${set.id}`);
    },
    [router, set],
  );

  /*
   * Left and right move through the set. A Bluetooth page turner sends exactly
   * these, which is the only way to change song with both hands on the guitar.
   * Up and down are left alone so the pedal can still scroll a long song.
   */
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
      if (event.key === "ArrowRight" || event.key === "PageDown") {
        event.preventDefault();
        if (next) go(next);
        else if (set) setFinishedAt(slug);
      }
      if (event.key === "ArrowLeft" || event.key === "PageUp") {
        event.preventDefault();
        go(previous);
      }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        turn(page + 1);
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        turn(page - 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [set, slug, next, previous, go, turn, page]);

  if (!song) {
    return (
      <main className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 p-8 text-center">
        <p className="text-[15px] text-bone-dim">Nothing in the library has the slug {slug}.</p>
        <Link href="/songs" className="btn">
          Back to songs
        </Link>
      </main>
    );
  }

  // The key it is played in tonight: the set's, or the one the song page was
  // showing, or the one it is written in.
  const asked = Number(params.get("key"));
  const root = set ? keyInSet(set, song) : params.has("key") && Number.isInteger(asked) && asked >= 0 && asked < 12 ? asked : song.root;
  // The song page can hand over a capo too, when it is being played without one.
  const askedCapo = Number(params.get("capo"));
  const capo = !set && params.has("capo") && Number.isInteger(askedCapo) && askedCapo >= 0 ? askedCapo : (song.capo ?? 0);
  const moved = root !== song.root;
  const numbering = numberingOf({ ...song, root });
  // On a stand you need the shape under your fingers, not the concert pitch.
  const playRoot = shapeRoot(numbering.root, effectiveCapo(capo, song.tuning));
  const inTuning = tuningOf(song.tuning).id;
  const hasChart = song.chart.some((section) => section.bars.length > 0);
  const manual = Math.min(MAX_SIZE, Math.max(MIN_SIZE, settings.lyricSize));
  const resize = (delta: number) => update({ lyricSize: Math.min(MAX_SIZE, Math.max(MIN_SIZE, manual + delta)) });
  const size = fit ? fitted : manual;

  const first = set?.slugs[0] ?? null;
  const chartText = (bar: string) => {
    const token = parseChord(bar, numbering.steps);
    if (settings.standChart === "numbers" || !token || token.hold) return bar;
    return chordName(token, playRoot);
  };
  const turnable = fit && pages > 1;

  if (set && finished) {
    // The end of the set is a place, not a greyed-out button.
    return (
      <main className="flex h-[100dvh] flex-col items-center justify-center gap-6 px-[var(--gutter)] text-center">
        <div>
          <p className="text-[18px] text-bone-dim">That&rsquo;s the set</p>
          <h1 className="mt-1 text-[40px] font-medium leading-tight tracking-tight">{set.name}</h1>
          <p className="mt-2 text-[16px] text-bone-dim">
            {set.slugs.length} song{set.slugs.length === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          <Link href={`/sets/${set.id}`} className="btn min-h-14 px-6 text-[16px]">
            Back to the set
          </Link>
          {first ? (
            <button
              type="button"
              className="btn btn-primary min-h-14 px-6 text-[16px]"
              onClick={() => {
                setFinishedAt(null);
                go(first);
              }}
            >
              Start again
            </button>
          ) : null}
        </div>
        <button type="button" className="btn btn-quiet" onClick={() => setFinishedAt(null)}>
          Back to {song.title}
        </button>
      </main>
    );
  }

  return (
    <main className="flex h-[100dvh] flex-col overflow-hidden">
      {/* Everything you might need mid-song, in one strip that never moves. Quiet,
          so in a dark room it is not brighter than the words. */}
      <header className="sticky top-0 z-20 flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line bg-ink px-[var(--gutter)] pb-2 pt-[max(8px,env(safe-area-inset-top))]">
        <Link
          href={set ? `/sets/${set.id}` : `/songs/${slug}`}
          aria-label="Leave the stand"
          className="btn btn-quiet flex flex-none items-center px-3"
        >
          <ArrowLeft size={ICON.md} weight="bold" />
        </Link>
        <span className="min-w-0 truncate text-[20px] font-medium tracking-tight">{song.title}</span>
        {set ? (
          <span className="flex-none font-mono text-[15px] text-bone-dim">
            {at + 1} of {set.slugs.length}
          </span>
        ) : null}
        {needsRetune(song.tuning) ? (
          <span className="flex-none rounded-[6px] bg-bone px-2 py-0.5 font-mono text-[15px] font-medium text-ink">
            {tuningOf(song.tuning).label}
          </span>
        ) : null}
        <span className="text-[16px] text-bone-dim">
          {effectiveCapo(capo, song.tuning)
            ? `${capo ? `Capo ${capo} · ` : ""}${KEYS[shapeRoot(root, effectiveCapo(capo, song.tuning))]} shapes · sounds ${KEYS[root]}`
            : `${capo ? `Capo ${capo} · ` : ""}${KEYS[root]} ${song.tonality}`}
          {moved ? <span className="font-mono text-[14px]"> · written {KEYS[song.root]}</span> : null}
        </span>
        <div className="ml-auto flex flex-none items-center gap-2">
          {hasChart ? (
            <button type="button" className="btn btn-quiet" aria-pressed={chartOpen} onClick={() => setChartOpen((open) => !open)}>
              {chartOpen ? "Hide chart" : "Show chart"}
            </button>
          ) : null}
          <Popover
            label="Text and chart settings"
            className="left-auto right-0"
            buttonClassName="border-transparent bg-transparent text-bone-dim"
            button={(open) => (
              <>
                <TextAa size={ICON.md} weight="bold" />
                <CaretDown size={ICON.sm} weight="bold" style={{ transform: open ? "rotate(180deg)" : undefined }} />
              </>
            )}
          >
            <span className="label">Words</span>
            <div className="flex flex-wrap items-center gap-2">
              <Segmented
                ariaLabel="Columns"
                value={columns}
                onChange={(count) => update({ lyricColumns: count })}
                options={[
                  { value: 1, label: "1 column" },
                  { value: 2, label: "2 columns" },
                ]}
              />
              <Toggle on={fit} onChange={(value) => update({ lyricFit: value })}>
                Fit the screen
              </Toggle>
            </div>
            {/* Sizing by hand only means anything when it is not being done for you. */}
            {fit ? null : (
              <div className="flex items-center gap-2">
                <button type="button" className="btn px-3" aria-label="Smaller text" onClick={() => resize(-3)}>
                  <Minus size={ICON.sm} weight="bold" />
                </button>
                <span className="w-12 text-center font-mono text-[13px] text-bone-dim">{manual}px</span>
                <button type="button" className="btn px-3" aria-label="Bigger text" onClick={() => resize(3)}>
                  <Plus size={ICON.sm} weight="bold" />
                </button>
              </div>
            )}
            {hasChart ? (
              <>
                <span className="label">Chart</span>
                <Segmented
                  ariaLabel="Chart shows"
                  value={settings.standChart}
                  onChange={(standChart) => update({ standChart })}
                  options={[
                    { value: "chords", label: "Chords" },
                    { value: "numbers", label: "Numbers" },
                  ]}
                />
              </>
            ) : null}
          </Popover>
        </div>
      </header>

      {/* The chart is what you glance at, so it is the biggest thing after the words. */}
      {chartOpen && hasChart ? (
        <div className="border-b border-line px-[var(--gutter)] py-2.5">
          {song.chart.filter((section) => section.bars.length > 0).map((section, sectionIndex) => (
            <div key={sectionIndex} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-1">
              <span className="w-20 flex-none text-[13px] uppercase tracking-[0.09em] text-bone-dim">{section.name}</span>
              <div className="flex flex-wrap gap-2">
                {section.bars.map((bar, index) => (
                  <span
                    key={index}
                    className="min-w-[76px] rounded-lg border border-line px-2.5 py-1 text-center font-mono text-[24px] font-medium leading-tight"
                  >
                    {chartText(bar)}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {lyrics ? (
        <div className="relative min-h-0 flex-1 px-[var(--gutter)] py-4 pb-[max(24px,env(safe-area-inset-bottom))]">
          <pre
            ref={lyricRef}
            className={`h-full whitespace-pre-wrap font-[family-name:var(--font-display)] text-bone ${
              fit ? "no-scrollbar overflow-x-auto overflow-y-hidden" : "overflow-y-auto"
            }`}
            onScroll={(event) => {
              if (turning.current || !fit) return;
              const el = event.currentTarget;
              if (el.clientWidth > 0) setPage(Math.round(el.scrollLeft / el.clientWidth));
            }}
            style={{
              fontSize: `${size}px`,
              lineHeight: 1.35,
              columnCount: columns,
              columnGap: "2.5rem",
              // Fill each column to the bottom rather than balancing them. Balanced
              // columns stop at the content's own height, which leaves the foot of
              // the screen empty and the type smaller than it needed to be.
              columnFill: fit ? "auto" : "balance",
            }}
          >
            {lyrics}
          </pre>
          {/*
            * Pages turn from the edges of the words themselves, or the pedal's up
            * and down. That leaves the bar at the bottom meaning one thing only,
            * the next song, so a page turn can never change song by mistake.
            */}
          {turnable ? (
            <>
              <button
                type="button"
                aria-label="Previous page"
                disabled={page === 0}
                onClick={() => turn(page - 1)}
                className="absolute inset-y-0 left-0 w-[22%] disabled:pointer-events-none"
              />
              <button
                type="button"
                aria-label="Next page"
                disabled={page >= pages - 1}
                onClick={() => turn(page + 1)}
                className="absolute inset-y-0 right-0 w-[22%] disabled:pointer-events-none"
              />
              <span className="pointer-events-none absolute bottom-2 right-[var(--gutter)] flex items-center gap-1 font-mono text-[14px] text-bone-dim">
                page {page + 1} of {pages}
                {page < pages - 1 ? <CaretRight size={ICON.sm} weight="bold" /> : null}
              </span>
            </>
          ) : null}
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
          <p className="max-w-[46ch] text-[18px] leading-relaxed text-bone-dim">No words for this song yet.</p>
          {/* Mid-set, leaving for the song page would lose your place in the order. */}
          {set ? null : (
            <Link href={`/songs/${slug}`} className="btn">
              Add the words
            </Link>
          )}
        </div>
      )}

      {set ? (
        <nav
          className="sticky bottom-0 z-20 flex items-stretch gap-2 border-t border-line bg-ink px-[var(--gutter)] pb-[max(8px,env(safe-area-inset-bottom))] pt-2"
          aria-label="Set"
        >
          <button
            type="button"
            className="btn flex min-h-16 flex-1 items-center justify-center gap-2"
            disabled={!previous}
            style={{ opacity: previous ? 1 : 0.3 }}
            onClick={() => go(previous)}
          >
            <CaretLeft size={ICON.md} weight="bold" />
            <span className="truncate text-[16px]">{previous ? songTitle(previous) : "Start of the set"}</span>
          </button>
          <button
            type="button"
            className="btn flex min-h-16 flex-1 items-center justify-center gap-2"
            onClick={() => (next ? go(next) : setFinishedAt(slug))}
          >
            <span className="flex min-w-0 flex-col items-center leading-tight">
              <span className="truncate text-[16px]">{next ? songTitle(next) : "End of the set"}</span>
              {retuneFor(next) ? (
                <span className="mt-1 truncate rounded-[5px] bg-bone px-1.5 font-mono text-[13px] font-medium text-ink">
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
