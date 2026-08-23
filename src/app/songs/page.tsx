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
        <p className="mt-2 max-w-[74ch] text-[14px] leading-relaxed text-bone-dim">
          Charts are written in numbers rather than chord names, so one chart plays in every key and the list tells you
          the shape of a song instead of what key someone happened to record it in.
        </p>
        <SongIndex />
      </main>
    </>
  );
}
