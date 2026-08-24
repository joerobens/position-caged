"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Minus, Plus } from "@phosphor-icons/react";
import { useLibrary } from "@/hooks/useLibrary";
import { useSettings } from "@/hooks/useSettings";
import { useTheme } from "@/hooks/useTheme";
import { useWakeLock } from "@/hooks/useWakeLock";
import { findSong } from "@/lib/songStore";
import { KEYS } from "@/lib/music";
import { chordName, numberingOf, parseChord } from "@/lib/nashville";

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
  useTheme(settings.theme);
  useWakeLock(true);
  const [chartOpen, setChartOpen] = useState(true);

  const song = findSong(library, slug);
  const lyrics = library.lyrics[slug] ?? "";

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
  const size = Math.min(MAX_SIZE, Math.max(MIN_SIZE, settings.lyricSize));
  const resize = (delta: number) => update({ lyricSize: Math.min(MAX_SIZE, Math.max(MIN_SIZE, size + delta)) });

  return (
    <main className="flex min-h-[100dvh] flex-col">
      {/* everything you might need mid-song, in one strip that never moves */}
      <header className="sticky top-0 z-20 flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line bg-ink px-[var(--gutter)] pb-2 pt-[max(8px,env(safe-area-inset-top))]">
        <Link href={`/songs/${slug}`} aria-label="Leave the stand" className="chip flex flex-none items-center px-3">
          <ArrowLeft size={16} weight="bold" />
        </Link>
        <span className="truncate text-[15px] font-medium">{song.title}</span>
        <span className="font-mono text-[13px] text-bone-dim">
          {KEYS[song.root]} {song.tonality}
          {song.capo ? ` · capo ${song.capo}` : ""}
        </span>
        <div className="ml-auto flex flex-none items-center gap-2">
          <button type="button" className="chip px-3" aria-label="Smaller text" onClick={() => resize(-3)}>
            <Minus size={15} weight="bold" />
          </button>
          <span className="w-9 text-center font-mono text-[12px] text-bone-dim">{size}</span>
          <button type="button" className="chip px-3" aria-label="Bigger text" onClick={() => resize(3)}>
            <Plus size={15} weight="bold" />
          </button>
          <button type="button" className="chip" aria-pressed={chartOpen} onClick={() => setChartOpen((open) => !open)}>
            Chart
          </button>
        </div>
      </header>

      {chartOpen ? (
        <div className="border-b border-line px-[var(--gutter)] py-2">
          {song.chart.map((section) => (
            <div key={section.name} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 py-1">
              <span className="label w-16 flex-none">{section.name}</span>
              <div className="flex flex-wrap gap-1.5">
                {section.bars.map((bar, index) => {
                  const token = parseChord(bar, numbering.steps);
                  return (
                    <span
                      key={index}
                      className="min-w-[52px] rounded-md border border-line px-2 py-1 text-center font-mono text-[14px] font-medium"
                    >
                      {token && !token.hold ? chordName(token, numbering.root) : bar}
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
    </main>
  );
}
