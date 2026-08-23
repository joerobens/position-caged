export type TheoryPage = {
  slug: string;
  n: string;
  title: string;
  blurb: string;
};

export const THEORY_PAGES: TheoryPage[] = [
  {
    slug: "nashville-numbers",
    n: "01",
    title: "The Nashville Number System",
    blurb: "Charts written in degrees rather than chord names, so one chart plays in every key.",
  },
  {
    slug: "caged-cycle",
    n: "02",
    title: "The CAGED cycle",
    blurb: "Why five shapes, why always in that order, and why the loop never breaks.",
  },
  {
    slug: "roots-and-octaves",
    n: "03",
    title: "Roots and octaves",
    blurb: "The lattice underneath everything, and the shapes that join it up.",
  },
  {
    slug: "following-the-changes",
    n: "04",
    title: "Following the changes",
    blurb: "Playing the chord you are on instead of the key you are in.",
  },
  {
    slug: "pentatonics-and-blues",
    n: "05",
    title: "Pentatonics and the blues blend",
    blurb: "Up major, down minor, and the two notes a fret apart that make it sound like blues.",
  },
];

export function findTheoryPage(slug: string): TheoryPage | undefined {
  return THEORY_PAGES.find((page) => page.slug === slug);
}
