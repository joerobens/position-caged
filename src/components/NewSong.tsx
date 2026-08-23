"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useLibrary } from "@/hooks/useLibrary";
import { addSong, slugify } from "@/lib/songStore";
import { KEYS, type Tonality } from "@/lib/music";
import { chordName, parseChord } from "@/lib/nashville";

export default function NewSong() {
  const library = useLibrary();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [credit, setCredit] = useState("");
  const [root, setRoot] = useState(0);
  const [tonality, setTonality] = useState<Tonality>("major");
  const [bars, setBars] = useState("1 1 4 1 | 1 5 1 1");

  const parsed = bars
    .split(/[|\n]/)
    .flatMap((line) => line.trim().split(/\s+/))
    .filter(Boolean);
  const unknown = parsed.filter((token) => parseChord(token, tonality) === null);
  const preview = parsed.map((token) => {
    const chord = parseChord(token, tonality);
    return chord && !chord.hold ? chordName(chord, root) : token;
  });

  const save = () => {
    if (!title.trim() || !parsed.length || unknown.length) return;
    const slug = slugify(title, library);
    addSong({
      slug,
      title: title.trim(),
      credit: credit.trim() || "yours",
      root,
      tonality,
      chart: [{ name: "Chart", bars: parsed }],
    });
    router.push(`/songs/${slug}`);
  };

  return (
    <main className="mx-auto w-full max-w-[760px] px-[var(--gutter)] py-7 pb-16">
      <Link href="/songs" className="text-[13px] text-bone-dim hover:text-bone">
        &larr; Songs
      </Link>
      <h1 className="mt-3 text-[22px] font-medium tracking-tight">Add a song</h1>
      <p className="mt-2 text-[14px] leading-relaxed text-bone-dim">
        Just the chart for now. Lyrics go on the song&rsquo;s own page once it exists. Everything you add here stays in
        this browser.
      </p>

      <div className="panel mt-5 flex flex-col gap-4">
        <label className="flex flex-col gap-2">
          <span className="label">Title</span>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="min-h-11 rounded-[10px] border border-line bg-ink px-3 text-sm text-bone outline-none focus-visible:border-bone-dim"
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="label">Credit</span>
          <input
            value={credit}
            onChange={(event) => setCredit(event.target.value)}
            placeholder="who wrote it, or where you got it from"
            className="min-h-11 rounded-[10px] border border-line bg-ink px-3 text-sm text-bone outline-none placeholder:text-bone-dim focus-visible:border-bone-dim"
          />
        </label>

        <div className="flex flex-col gap-2">
          <span className="label">Key</span>
          <div className="chip-row">
            {KEYS.map((name, index) => (
              <button key={name} type="button" className="chip" aria-pressed={index === root} onClick={() => setRoot(index)}>
                {name}
              </button>
            ))}
          </div>
          <div className="segmented w-fit">
            {(["major", "minor"] as const).map((value) => (
              <button key={value} type="button" aria-pressed={tonality === value} onClick={() => setTonality(value)}>
                {value}
              </button>
            ))}
          </div>
        </div>

        <label className="flex flex-col gap-2">
          <span className="label">Chart, in numbers</span>
          <textarea
            value={bars}
            onChange={(event) => setBars(event.target.value)}
            rows={3}
            className="rounded-xl border border-line bg-ink p-3 font-mono text-sm text-bone outline-none focus-visible:border-bone-dim"
          />
          <span className="text-[13px] leading-relaxed text-bone-dim">
            One entry per bar, separated by spaces. Bar lines and new lines are ignored. Use{" "}
            <b className="font-medium text-bone">m</b> for minor, <b className="font-medium text-bone">b</b> or{" "}
            <b className="font-medium text-bone">#</b> to shift a degree, and <b className="font-medium text-bone">%</b>{" "}
            to hold the previous chord.
          </span>
        </label>

        <div className="rounded-xl border border-line bg-ink p-3">
          <span className="label">In {KEYS[root]} that reads</span>
          <p className="mt-2 font-mono text-[14px] leading-relaxed" style={{ color: unknown.length ? "var(--color-bone-dim)" : "var(--accent)" }}>
            {preview.join("  ") || "nothing yet"}
          </p>
          {unknown.length ? (
            <p className="mt-2 text-[13px] leading-relaxed text-bone-dim">
              Cannot read <b className="font-medium text-bone">{unknown.join(", ")}</b>. Every bar needs to start with a
              number from 1 to 7.
            </p>
          ) : null}
        </div>

        <button
          type="button"
          className="chip self-start"
          disabled={!title.trim() || !parsed.length || unknown.length > 0}
          style={{
            background: "var(--accent)",
            borderColor: "var(--accent)",
            color: "var(--color-ink)",
            fontWeight: 500,
            opacity: !title.trim() || unknown.length ? 0.4 : 1,
          }}
          onClick={save}
        >
          Save to this browser
        </button>
      </div>
    </main>
  );
}
