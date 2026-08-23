import TheoryNeck from "@/components/TheoryNeck";
import { Aside, B, H, P, Table } from "./Prose";

export default function CagedCycle() {
  return (
    <>
      <P>
        There are five open chord shapes every guitarist learns first: C, A, G, E and D. Move any one of them up the
        neck and barre what the nut was holding, and it is still that shape, just naming a different chord. Five
        shapes, and between them they cover the whole neck for any chord you like. That is the entire system.
      </P>

      <H>The five shapes for one chord</H>
      <P>
        Take C major. The C shape sits at the nut, and the same chord turns up again as an A shape at the third fret, a
        G shape at the fifth, an E shape at the eighth and a D shape at the tenth. Five ways to play one chord, spread
        along the neck.
      </P>
      <TheoryNeck
        root={0}
        allShapes
        zoom="neck"
        caption="Every C major chord tone on the neck, coloured by the shape that frets it. The bars underneath show where each shape sits. Where two colours split a dot, both shapes are holding that note down."
      />

      <H>The order never changes</H>
      <P>
        Going up the neck the shapes always appear in the order C, A, G, E, D, and then C again an octave higher. It
        never breaks and it never reorders. What changes between keys is only where you enter the loop.
      </P>
      <Table
        head={["Key", "Going up the neck"]}
        rows={[
          ["C", "C at 0, A at 3, G at 5, E at 8, D at 10"],
          ["A", "A at 0, G at 2, E at 5, D at 7, C at 9"],
          ["F", "E at 1, D at 3, C at 5, A at 8, G at 10"],
          ["B", "A at 2, G at 4, E at 7, D at 9, C at 11"],
        ]}
      />
      <P>
        Read those rows across and they are all the same sequence, started at a different letter. F begins at E and
        wraps round to G; B begins at A. This holds in all twelve keys, and the app relies on it: the shape chips are
        simply sorted by fret, and that sort always walks the cycle.
      </P>

      <H>The shapes overlap, and that is the useful part</H>
      <P>
        Neighbouring shapes share notes. In A major the A and G shapes both hold three notes at the second fret, the G
        and E shapes share the fifth, the E and D shapes share the seventh. Those shared notes are the seam: they are
        where you cross from one box to the next without lifting your hand off the neck.
      </P>
      <TheoryNeck
        root={9}
        allShapes
        zoom="neck"
        caption="A major. The split dots are the seams between neighbouring shapes."
      />

      <Aside>
        <B>The practical bit.</B> Most players learn the five boxes and then play each one as an island. The shapes are
        only worth anything once you can move between them, which is what the seams are for and why the app has a
        two-shape slide drill. Learning box six is not the goal; there is no box six.
      </Aside>

      <H>In minor</H>
      <P>
        The geometry is identical. Every major third drops a semitone to become a minor third and the rest of the shape
        stays exactly where it was. The C and G forms lose their third off the top of the shape when you do this, so
        those two strings take the fifth instead, which is why the minor C and G forms look like stretches. The order,
        the positions and the seams are all unchanged.
      </P>
      <TheoryNeck
        root={9}
        tonality="minor"
        shape="E"
        scale="Minor pent"
        caption="A minor, E shape at the fifth fret, with the minor pentatonic around it. Filled dot is the root; thick ring is a note the shape is holding down."
      />
    </>
  );
}
