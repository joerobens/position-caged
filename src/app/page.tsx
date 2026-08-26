import Link from "next/link";
import SiteNav from "@/components/SiteNav";
import { SEEDED_SONGS } from "@/lib/songs";

export const metadata = {
  title: "Position - learn the neck, then play something on it",
  description:
    "A fretboard tool, a library of songs written in numbers so they work in any key, and the theory behind both.",
};

const SECTIONS = [
  {
    href: "/play",
    tag: "The tool",
    title: "Fretboard",
    body: "Five shapes, roots and octaves, scales, and drills that run to a metronome. Learn mode to read the neck, Practice to play to the clock.",
  },
  {
    href: "/songs",
    tag: "Reference",
    title: "Songs",
    body: "Charts in Nashville numbers with your own lyrics under them. Change the key and the numbers stay put while the chords re-spell.",
  },
  {
    href: "/theory",
    tag: "Reference",
    title: "Theory",
    body: "Short pages on what the tool is showing you, with live diagrams drawn by the same engine rather than screenshots.",
  },
];

export default function Home() {
  return (
    <>
      <SiteNav />
      <main className="mx-auto w-full max-w-[1180px] px-[var(--gutter)] py-8 pb-16">
        <section className="grid gap-7 lg:grid-cols-[1.15fr_.85fr] lg:items-start">
          <div>
            <h1 className="text-[26px] font-medium leading-tight tracking-tight sm:text-[32px]">
              Learn the neck, then play something on it.
            </h1>
            <p className="mt-3 max-w-[60ch] text-[15px] leading-relaxed text-bone-dim">
              A fretboard tool, a library of songs written in numbers so they work in any key, and the theory behind
              both. Built to be read from a music stand at arm&rsquo;s length.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link href="/play" className="btn btn-primary">
                Open the fretboard
              </Link>
              <Link href="/songs" className="btn">
                Browse songs
              </Link>
            </div>
          </div>
          <div className="panel">
            <span className="label">Where to start</span>
            <p className="mt-2 text-[13px] leading-relaxed text-bone-dim">
              If the neck is still a grid to you, open the fretboard, pick <b className="font-medium text-bone">Roots</b>{" "}
              and look at nothing else for a week. Everything on this site is built on top of knowing where those are.
            </p>
          </div>
        </section>

        <section className="mt-10 grid gap-3 sm:grid-cols-3">
          {SECTIONS.map((section) => (
            <Link key={section.href} href={section.href} className="panel transition-colors hover:border-bone-dim">
              <span className="label">{section.tag}</span>
              <h2 className="mt-1.5 text-[15px] font-medium">{section.title}</h2>
              <p className="mt-1.5 text-[13px] leading-relaxed text-bone-dim">{section.body}</p>
            </Link>
          ))}
        </section>

        <section className="mt-10">
          <h2 className="label">In the library</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {SEEDED_SONGS.map((song) => (
              <li key={song.slug}>
                <Link href={`/songs/${song.slug}`} className="btn">
                  {song.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </>
  );
}
