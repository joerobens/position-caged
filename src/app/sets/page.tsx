import SiteNav from "@/components/SiteNav";
import SetIndex from "@/components/SetIndex";

export const metadata = { title: "Sets - Position", description: "Songs in an order, for playing straight through." };

export default function SetsPage() {
  return (
    <>
      <SiteNav />
      <main className="mx-auto w-full max-w-[1180px] px-[var(--gutter)] py-7 pb-16">
        <h1 className="text-[22px] font-medium tracking-tight">Sets</h1>
        <p className="mt-2 max-w-[74ch] text-[14px] leading-relaxed text-bone-dim">
          Songs in an order. Put one on the stand and you can move through it without touching the screen twice.
        </p>
        <SetIndex />
      </main>
    </>
  );
}
