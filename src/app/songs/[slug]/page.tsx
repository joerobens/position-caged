import SiteNav from "@/components/SiteNav";
import SongView from "@/components/SongView";
import { SEEDED_SONGS } from "@/lib/songs";

/** The seeded charts prerender. Anything you added is resolved in the browser. */
export function generateStaticParams() {
  return SEEDED_SONGS.map((song) => ({ slug: song.slug }));
}

export default async function SongPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return (
    <>
      <SiteNav />
      <SongView slug={slug} />
    </>
  );
}
