import { notFound } from "next/navigation";
import Link from "next/link";
import SiteNav from "@/components/SiteNav";
import CagedCycle from "@/components/theory/CagedCycle";
import FollowingTheChanges from "@/components/theory/FollowingTheChanges";
import NashvilleNumbers from "@/components/theory/NashvilleNumbers";
import PentatonicsAndBlues from "@/components/theory/PentatonicsAndBlues";
import ChordsOfAKey from "@/components/theory/ChordsOfAKey";
import RootsAndOctaves from "@/components/theory/RootsAndOctaves";
import { THEORY_PAGES, findTheoryPage } from "@/lib/theory";

const CONTENT: Record<string, () => React.ReactElement> = {
  "nashville-numbers": NashvilleNumbers,
  "caged-cycle": CagedCycle,
  "roots-and-octaves": RootsAndOctaves,
  "following-the-changes": FollowingTheChanges,
  "chords-of-a-key": ChordsOfAKey,
  "pentatonics-and-blues": PentatonicsAndBlues,
};

export function generateStaticParams() {
  return THEORY_PAGES.map((page) => ({ slug: page.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = findTheoryPage(slug);
  return page ? { title: `${page.title} - Position`, description: page.blurb } : {};
}

export default async function TheoryDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = findTheoryPage(slug);
  const Content = CONTENT[slug];
  if (!page || !Content) notFound();

  const index = THEORY_PAGES.findIndex((entry) => entry.slug === slug);
  const previous = THEORY_PAGES[index - 1];
  const next = THEORY_PAGES[index + 1];

  return (
    <>
      <SiteNav />
      <main className="mx-auto w-full max-w-[1180px] px-[var(--gutter)] py-7 pb-16">
        <Link href="/theory" className="text-[13px] text-bone-dim hover:text-bone">
          &larr; Theory
        </Link>
        <p className="label mt-3">{page.n}</p>
        <h1 className="mt-1 text-[24px] font-medium tracking-tight">{page.title}</h1>
        <article className="mt-5">
          <Content />
        </article>

        <nav className="mt-12 flex flex-wrap gap-3 border-t border-line pt-5" aria-label="More theory">
          {previous ? (
            <Link href={`/theory/${previous.slug}`} className="panel flex-1 basis-64 transition-colors hover:border-bone-dim">
              <span className="label">Previous</span>
              <span className="mt-1 block text-[14px] font-medium">{previous.title}</span>
            </Link>
          ) : null}
          {next ? (
            <Link href={`/theory/${next.slug}`} className="panel flex-1 basis-64 transition-colors hover:border-bone-dim">
              <span className="label">Next</span>
              <span className="mt-1 block text-[14px] font-medium">{next.title}</span>
            </Link>
          ) : null}
        </nav>
      </main>
    </>
  );
}
