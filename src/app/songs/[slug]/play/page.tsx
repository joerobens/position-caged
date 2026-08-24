import StageView from "@/components/StageView";
import { SEEDED_SONGS } from "@/lib/songs";

export function generateStaticParams() {
  return SEEDED_SONGS.map((song) => ({ slug: song.slug }));
}

export default async function StagePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <StageView slug={slug} />;
}
