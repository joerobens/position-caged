import { Suspense } from "react";
import StageView from "@/components/StageView";
import { SEEDED_SONGS } from "@/lib/songs";

export function generateStaticParams() {
  return SEEDED_SONGS.map((song) => ({ slug: song.slug }));
}

export default async function StagePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return (
    // The stand reads the set out of the query string, so it needs a boundary to
    // prerender behind.
    <Suspense fallback={<div className="min-h-[100dvh] bg-ink" />}>
      <StageView slug={slug} />
    </Suspense>
  );
}
