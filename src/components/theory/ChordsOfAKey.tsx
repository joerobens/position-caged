import TheoryNeck from "@/components/TheoryNeck";
import { chordFamily } from "@/lib/family";
import { Aside, B, H, N, P, Table } from "./Prose";

const ONE = { root: 0, offset: 0, name: "C", roman: "I" };
const FOUR = { root: 5, offset: 5, name: "F", roman: "IV" };
const SIX = { root: 9, offset: 9, name: "Am", roman: "vi" };

export default function ChordsOfAKey() {
  const major = chordFamily(0, "major");
  const minor = chordFamily(9, "minor");

  return (
    <>
      <P>
        A key is not just a note to start on. It is a set of seven notes, and if you build a chord on each of those
        notes using only the others, you get seven chords that belong together. Nearly every song you know lives
        inside one of these sets, which is why a song can be four chords long and still sound finished.
      </P>

      <H>Where the chords come from</H>
      <P>
        Take the scale and stack thirds: from each note, skip one, take the next, skip one, take the next. In{" "}
        <B>C major</B> that gives C E G on the first degree, which is a major chord, and D F A on the second, which is
        a minor one. Nobody decided that. It falls out of the scale, and because every major scale has the same gaps
        in the same order, every major key produces the same pattern.
      </P>

      <Table
        head={["Degree", "Chord", "In C", "What it does"]}
        rows={major.map((chord) => [
          <N key="n">{chord.token}</N>,
          chord.roman,
          <B key="b">{chord.name}</B>,
          chord.job,
        ])}
      />

      <P>
        Three major, three minor, one diminished, always in that order. Learn it once and you have it in all twelve
        keys, because the numbers do not move when the key does. That is the same reason the charts in this app are
        written in numbers.
      </P>

      <H>Three of them, in one place</H>
      <P>
        The family is not an abstraction: it is chords you can reach. These three are the <N>1</N>, the <N>4</N> and
        the <N>6-</N> of C, all found without moving your hand far, and between them they play a very large number of
        songs.
      </P>
      <TheoryNeck
        root={0}
        chord={ONE}
        shape="A"
        caption="The one. Filled dots are the chord tones of C, and the thin rings are the rest of the key around them."
      />
      <TheoryNeck
        root={0}
        chord={FOUR}
        shape="A"
        caption="The four. Same hand position, same key, and the chord tones have moved to F while the key has not."
      />
      <TheoryNeck
        root={0}
        chord={SIX}
        shape="A"
        caption="The six, which is the relative minor. Note how many dots it shares with the one: they differ by a single note, which is why the two sound so close."
      />

      <H>The minor family</H>
      <P>
        A minor key uses the same seven notes as the major key three semitones above it, so it produces the same seven
        chords. What changes is which one you call home. Start on <B>A</B> rather than C and the family reorders
        itself around it.
      </P>

      <Table
        head={["Degree", "Chord", "In A minor", "What it does"]}
        rows={minor.map((chord) => [
          <N key="n">{chord.token}</N>,
          chord.roman,
          <B key="b">{chord.name}</B>,
          chord.job,
        ])}
      />

      <Aside>
        The numbers in that table count from C, not from A, because that is how minor charts are written: from the
        relative major. It looks odd until you notice that both tables are describing the same seven chords, so both
        can use the same numbers. A minor song starting on <N>6-</N> is starting at home.
      </Aside>

      <H>What it is for</H>
      <P>
        Two things. When you are working a song out by ear, the family tells you what to try: if a song is in G, the
        chord you cannot name is far more likely to be one of the other six than something from outside. And when you
        already know the chart, the degrees the song leaves alone tell you as much as the ones it uses.
      </P>
      <P>
        A song that lives on <N>1</N>, <N>4</N> and <N>5</N> is bright, because those are the three major ones. A song
        that leans on <N>6-</N> and <N>2-</N> is not, and it is not the melody doing that, it is the family.
      </P>

      <Aside>
        The seventh is the odd one. A diminished chord is unstable by design and rarely played on its own, which is
        why a song can use six chords out of seven and sound like it has used them all.
      </Aside>
    </>
  );
}
