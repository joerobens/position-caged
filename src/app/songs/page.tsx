import SiteNav from "@/components/SiteNav";
import SongIndex from "@/components/SongIndex";

export const metadata = {
  title: "Songs - Position",
  description: "Charts in Nashville numbers, so one chart plays in every key.",
};

export default function SongsPage() {
  return (
    <>
      <SiteNav />
      <main className="mx-auto w-full max-w-[1180px] px-[var(--gutter)] py-7 pb-16">
        <h1 className="text-[22px] font-medium tracking-tight">Songs</h1>
        <SongIndex />
      </main>
    </>
  );
}
