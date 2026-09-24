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
        <SyncPanel />
        <LibraryBackup />
      </main>
    </>
  );
}
