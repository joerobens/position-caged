import Link from "next/link";
import SiteNav from "@/components/SiteNav";
import { THEORY_PAGES } from "@/lib/theory";

export const metadata = {
  title: "Theory - Position",
  description: "Short pages on what the fretboard tool is showing you.",
};


export default function TheoryPage() {
  return (
    <>
      <SiteNav />
      <main className="mx-auto w-full max-w-[1180px] px-[var(--gutter)] py-7 pb-16">
        <h1 className="text-[22px] font-medium tracking-tight">Theory</h1>
        <p className="mt-2 max-w-[74ch] text-[14px] leading-relaxed text-bone-dim">
          Short pages on what the fretboard tool is showing you. Every diagram is drawn by the same engine the tool
          uses, so nothing here can drift out of step with it.
        </p>
        <ul className="mt-5 grid gap-3 sm:grid-cols-2">
          {THEORY_PAGES.map((page) => (
            <li key={page.slug}>
              <Link href={`/theory/${page.slug}`} className="panel block h-full transition-colors hover:border-bone-dim">
                <span className="label">{page.n}</span>
                <h2 className="mt-1.5 text-[15px] font-medium">{page.title}</h2>
                <p className="mt-1.5 text-[13px] leading-relaxed text-bone-dim">{page.blurb}</p>
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </>
  );
}
