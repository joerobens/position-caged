"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, CaretLeft, CaretRight, ListNumbers } from "@phosphor-icons/react";
import Popover from "@/components/Popover";
import { Segmented } from "@/components/controls";
import { useLibrary } from "@/hooks/useLibrary";
import { useSettings } from "@/hooks/useSettings";
import { useTheme } from "@/hooks/useTheme";
import { useWakeLock } from "@/hooks/useWakeLock";
import { findSet, findSong, keyInSet } from "@/lib/songStore";
import { KEYS } from "@/lib/music";
import { effectiveCapo, needsRetune, tuningOf } from "@/lib/tunings";
import { chartChords, chordName, numberingOf, parseChord, shapeRoot } from "@/lib/nashville";
import { ICON } from "@/lib/icons";
import { useFitText } from "@/hooks/useFitText";

/** Small enough that any song fits. It is a cue, and at a metre small type still jogs the memory. */
const MIN_SIZE = 8;
const MAX_SIZE = 56;
const COLUMNS = [1, 2, 3];

/**
 * The view you actually use: guitar in your hands, iPad on a stand, a metre away.
 *
 * The words have the screen, all of them at once, as a cue: no scrolling and no
 * pages, with the type and the number of columns chosen to make them as large
 * as they can be. Key, capo and chords sit in one quiet line above. The chart
 * opens when you want it and the words re-fit around it. The screen stays awake.
 */
export default function StageView({ slug }: { slug: string }) {
  const library = useLibrary();
  const { settings, update } = useSettings();
  const router = useRouter();
  const params = useSearchParams();
  useTheme(settings.theme);
  useWakeLock(true);
  // Which song the set was finished from. Keyed to the song, so moving clears it.
  const [finishedAt, setFinishedAt] = useState<string | null>(null);
  const finished = finishedAt === slug;

  const song = findSong(library, slug);
  const lyrics = library.lyrics[slug] ?? "";
  // With no words, the chart is all there is, so it shows whatever the toggle says.
  const showChart = settings.standChanges || !lyrics.trim();

  const { ref: lyricRef, size, columns } = useFitText<HTMLPreElement>({
    enabled: Boolean(lyrics.trim()),
    min: MIN_SIZE,
    max: MAX_SIZE,
    columns: COLUMNS,
    deps: [lyrics, showChart, slug],
  });

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
   * With every word on one screen there is nothing to turn within a song.
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
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [set, slug, next, previous, go]);

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
  const held = effectiveCapo(capo, song.tuning);
  // On a stand you need the shape under your fingers, not the concert pitch.
  const playRoot = shapeRoot(numbering.root, held);
  const inTuning = tuningOf(song.tuning).id;
  const hasChart = song.chart.some((section) => section.bars.length > 0);
  const numbers = settings.standChart === "numbers";

  const chartText = (bar: string) => {
    const token = parseChord(bar, numbering.steps);
    if (numbers || !token || token.hold) return bar;
    return chordName(token, playRoot);
  };
  // Every chord the song uses, in the order it first turns up: the reminder, not the chart.
  const chordsUsed = chartChords(
    song.chart.flatMap((section) => section.bars),
    numbering.steps,
  ).map((token) => (numbers ? token.raw : chordName(token, playRoot)));
  const hands =
    held === 0 && !needsRetune(song.tuning)
      ? `${KEYS[root]} ${song.tonality}`
      : `${KEYS[shapeRoot(root, held)]}${song.tonality === "minor" ? "m" : ""} shapes${capo ? ` · capo ${capo}` : ""}`;

  const first = set?.slugs[0] ?? null;

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
      {/* One quiet line: what it is, where you are, what your hands do. Nothing
          here is brighter than the words. */}
      <header className="flex flex-none flex-wrap items-center gap-x-4 gap-y-1 border-b border-line bg-ink px-[var(--gutter)] pb-1.5 pt-[max(6px,env(safe-area-inset-top))]">
        <Link
          href={set ? `/sets/${set.id}` : `/songs/${slug}`}
          aria-label="Leave the stand"
          className="btn btn-quiet -ml-2 flex flex-none items-center px-2"
        >
          <ArrowLeft size={ICON.md} weight="bold" />
        </Link>
        <span className="min-w-0 truncate text-[18px] font-medium tracking-tight">{song.title}</span>
        {set ? <span className="flex-none font-mono text-[14px] text-bone-dim">{at + 1} of {set.slugs.length}</span> : null}
        <span className="flex-none text-[15px] text-bone-dim">
          {hands}
          {held || needsRetune(song.tuning) ? ` · sounds ${KEYS[root]}` : ""}
          {moved ? <span className="font-mono text-[13px]"> · written {KEYS[song.root]}</span> : null}
        </span>
        {needsRetune(song.tuning) ? (
          <span className="flex-none rounded-[6px] bg-bone px-2 py-0.5 font-mono text-[14px] font-medium text-ink">
            {tuningOf(song.tuning).label}
          </span>
        ) : null}
        {chordsUsed.length && !showChart ? (
          <span className="min-w-0 truncate font-mono text-[15px] text-bone-dim">{chordsUsed.join("  ")}</span>
        ) : null}
        <div className="ml-auto flex flex-none items-center gap-1">
          {hasChart && lyrics.trim() ? (
            <button
              type="button"
              className="btn btn-quiet"
              aria-pressed={settings.standChanges}
              onClick={() => update({ standChanges: !settings.standChanges })}
            >
              {settings.standChanges ? "Hide changes" : "Changes"}
            </button>
          ) : null}
          {set ? (
            <Popover
              label="Running order"
              className="left-auto right-0 max-h-[70dvh] overflow-y-auto"
              buttonClassName="border-transparent bg-transparent text-bone-dim"
              button={() => <ListNumbers size={ICON.md} weight="bold" />}
            >
              {(close) => (
                <>
                  <span className="label">{set.name}</span>
                  <ol className="flex flex-col gap-1">
                    {set.slugs.map((entry, index) => (
                      <li key={entry}>
                        <button
                          type="button"
                          aria-current={entry === slug ? "true" : undefined}
                          className={`chip flex w-full items-center gap-3 text-left ${entry === slug ? "border-bone-dim" : ""}`}
                          onClick={() => {
                            close();
                            go(entry);
                          }}
                        >
                          <span className="w-5 font-mono text-[13px] text-bone-dim">{index + 1}</span>
                          <span className="truncate">{songTitle(entry)}</span>
                        </button>
                      </li>
                    ))}
                  </ol>
                </>
              )}
            </Popover>
          ) : null}
        </div>
      </header>

      {/* The chart, when asked for. It pushes the words down rather than covering them. */}
      {showChart && hasChart ? (
        <div className="flex flex-none flex-wrap items-start gap-x-6 gap-y-2 border-b border-line px-[var(--gutter)] py-2.5">
          <div className="flex min-w-0 flex-1 flex-col">
            {song.chart
              .filter((section) => section.bars.length > 0)
              .map((section, sectionIndex) => (
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
          <Segmented
            ariaLabel="The chart shows"
            value={settings.standChart}
            onChange={(standChart) => update({ standChart })}
            options={[
              { value: "chords", label: "Chords" },
              { value: "numbers", label: "Numbers" },
            ]}
          />
        </div>
      ) : null}

      {lyrics.trim() ? (
        <div className="min-h-0 flex-1 px-[var(--gutter)] py-3 pb-[max(12px,env(safe-area-inset-bottom))]">
          <pre
            ref={lyricRef}
            className="h-full overflow-hidden whitespace-pre-wrap font-[family-name:var(--font-display)] text-bone"
            style={{
              fontSize: `${size}px`,
              lineHeight: 1.3,
              columnCount: columns,
              columnGap: "2.5rem",
              columnRule: columns > 1 ? "1px solid var(--color-line)" : undefined,
              // Fill each column to the bottom rather than balancing them, so the
              // type can be as large as the box allows.
              columnFill: "auto",
            }}
          >
            {lyrics}
          </pre>
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
          className="flex flex-none items-stretch gap-2 border-t border-line bg-ink px-[var(--gutter)] pb-[max(8px,env(safe-area-inset-bottom))] pt-2"
          aria-label="Set"
        >
          <button
            type="button"
            className="btn flex min-h-14 flex-1 items-center justify-center gap-2"
            disabled={!previous}
            style={{ opacity: previous ? 1 : 0.3 }}
            onClick={() => go(previous)}
          >
            <CaretLeft size={ICON.md} weight="bold" />
            <span className="truncate text-[16px]">{previous ? songTitle(previous) : "Start of the set"}</span>
          </button>
          <button
            type="button"
            className="btn flex min-h-14 flex-1 items-center justify-center gap-2"
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
