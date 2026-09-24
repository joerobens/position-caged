import SiteNav from "@/components/SiteNav";
import SetIndex from "@/components/SetIndex";

export const metadata = { title: "Sets - Position", description: "Songs in an order, for playing straight through." };

export default function SetsPage() {
  return (
    <>
      <SiteNav />
      <main className="mx-auto w-full max-w-[1180px] px-[var(--gutter)] py-7 pb-16">
        <h1 className="text-[22px] font-medium tracking-tight">Sets</h1>
        <SetIndex />
      </main>
    </>
  );
}
