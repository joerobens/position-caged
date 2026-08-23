import Link from "next/link";
import SiteNav from "@/components/SiteNav";

export const metadata = {
  title: "Theory - Position",
  description: "Short pages on what the fretboard tool is showing you.",
};

const PAGES = [
  { n: "01", title: "The CAGED cycle", body: "Why five shapes, why always in that order, and why the loop never breaks." },
  { n: "02", title: "Roots and octaves", body: "The lattice underneath everything, and the two shapes that join it up." },
  { n: "03", title: "Triads and inversions", body: "CAGED through a three string window, and why the top note is the one that matters." },
  { n: "04", title: "Following the changes", body: "Playing the chord you are on instead of the key you are in." },
  { n: "05", title: "Pentatonics and the blues blend", body: "Up major, down minor, and the two notes a fret apart that make it sound like blues." },
];

export default function TheoryPage() {
  return (
    <>
      <SiteNav />
      <main className="mx-auto w-full max-w-[1180px] px-[var(--gutter)] py-7 pb-16">
        <h1 className="text-[22px] font-medium tracking-tight">Theory</h1>
        <p className="mt-2 max-w-[74ch] text-[14px] leading-relaxed text-bone-dim">
          Short pages on what the fretboard tool is showing you. Every diagram will be drawn by the same engine the
          tool uses, so nothing here can drift out of step with it.
        </p>
        <ul className="mt-5 grid gap-3 sm:grid-cols-2">
          {PAGES.map((page) => (
            <li key={page.n} className="panel">
              <span className="label">{page.n}</span>
              <h2 className="mt-1.5 text-[15px] font-medium">{page.title}</h2>
              <p className="mt-1.5 text-[13px] leading-relaxed text-bone-dim">{page.body}</p>
            </li>
          ))}
        </ul>
        <p className="mt-5 rounded-xl border border-line bg-panel p-4 text-[13px] leading-relaxed text-bone-dim">
          Not written yet. The structure is here so the shape of the site is settled; the pages come next, and each one
          will carry a live neck rather than a picture of one. In the meantime the{" "}
          <Link href="/play" className="text-bone underline decoration-line underline-offset-2">
            fretboard
          </Link>{" "}
          explains most of this in its own info controls.
        </p>
      </main>
    </>
  );
}
