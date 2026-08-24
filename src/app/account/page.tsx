import Link from "next/link";
import SiteNav from "@/components/SiteNav";
import SyncPanel from "@/components/SyncPanel";
import LibraryBackup from "@/components/LibraryBackup";

export const metadata = { title: "Account - Position", description: "Signing in, and syncing your library." };

export default function AccountPage() {
  return (
    <>
      <SiteNav />
      <main className="mx-auto w-full max-w-[820px] px-[var(--gutter)] py-7 pb-16">
        <h1 className="text-[22px] font-medium tracking-tight">Account</h1>
        <p className="mt-2 max-w-[74ch] text-[14px] leading-relaxed text-bone-dim">
          Signing in is optional. Everything works without it, from this browser: the app reads the browser copy even
          when it has a connection, so a stand with no signal behaves exactly the same. Signing in only means your
          songs, words and sets also exist somewhere that survives a cleared cache and follows you to another device.
        </p>
        <SyncPanel />
        <LibraryBackup />
        <p className="mt-6 text-[13px] leading-relaxed text-bone-dim">
          Back to <Link href="/songs" className="text-bone underline decoration-line underline-offset-2">songs</Link>.
        </p>
      </main>
    </>
  );
}
