import SiteNav from "@/components/SiteNav";
import SetEditor from "@/components/SetEditor";

export const dynamic = "force-static";
export const metadata = { title: "Set - Position" };

export default async function SetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <>
      <SiteNav />
      <SetEditor id={id} />
    </>
  );
}
