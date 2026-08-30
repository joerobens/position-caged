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
    slug: "chords-of-a-key",
    n: "05",
    title: "The chords of a key",
    blurb: "Seven chords fall out of a scale, always in the same order, and most songs live inside them.",
  },
  {
    slug: "the-chord-wheel",
    n: "06",
    title: "The chord wheel",
    blurb: "Why those six chords go together, and why turning it one notch gives you the next key.",
  },
  {
    slug: "pentatonics-and-blues",
    n: "07",
    title: "Pentatonics and the blues blend",
    blurb: "Up major, down minor, and the two notes a fret apart that make it sound like blues.",
  },
];

export function findTheoryPage(slug: string): TheoryPage | undefined {
  return THEORY_PAGES.find((page) => page.slug === slug);
}
