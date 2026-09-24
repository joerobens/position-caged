import SiteNav from "@/components/SiteNav";
import Resume from "@/components/Resume";

export const metadata = {
  title: "Position",
  description: "Learn the neck, practise it to a clock, and keep your songs and sets for the stand.",
};

export default function Home() {
  return (
    <>
      <SiteNav />
      <Resume />
    </>
  );
}
