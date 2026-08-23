import TheoryNeck from "@/components/TheoryNeck";
import { Aside, B, H, N, P, Table } from "./Prose";

export default function RootsAndOctaves() {
  return (
    <>
      <P>
        Before the shapes, before the scales, there is one question worth being able to answer instantly: where is this
        note? Every shape in the CAGED system is anchored to a root, and if you cannot find the root the shape has
        nothing to hang on.
      </P>

      <H>The lattice</H>
      <P>
        Strip the neck back to a single note and a pattern appears. In C there are eight of them inside the first
        fifteen frets, and they are not scattered: they sit in a lattice you can walk.
      </P>
      <TheoryNeck
        root={0}
        rootMap
        zoom="neck"
        caption="Every C on the neck. Each takes the colour of the CAGED form that frets it, and the lines are octaves."
      />

      <H>The octave shapes</H>
      <P>
        The lines in that diagram are the ones every guitarist ends up knowing without being taught. Each joins a note
        to the same note somewhere else, and there are only really four of them.
      </P>
      <Table
        head={["From", "To", "Move"]}
        rows={[
          ["6th string", "4th string", "two strings over, two frets up"],
          ["5th string", "3rd string", "two strings over, two frets up"],
          ["4th string", "2nd string", "two strings over, three frets up"],
          ["3rd string", "1st string", "two strings over, three frets up"],
          ["6th string", "1st string", "straight across, same fret, two octaves"],
        ]}
      />
      <P>
        The reason the bottom two are three frets rather than two is the B string. The guitar is tuned in fourths
        except for the gap between the third and second strings, which is a third, and every shape on the neck bends
        around that one irregularity.
      </P>

      <H>Why this is the thing to learn first</H>
      <P>
        Because it is what a position shift actually is. When you move from one CAGED shape to the next you are moving
        to another instance of the same root; the octave shape is the move. Learn the lattice and the five shapes stop
        being five diagrams and start being five places to stand.
      </P>
      <P>
        There is also a shortcut hidden in it. In every one of the five shapes, in both major and minor, the root is
        the lowest note the shape plays. So the lowest note under your fingers names the chord, in all sixty shape and
        key combinations, without counting anything.
      </P>

      <Aside>
        <B>How to drill it.</B> Open the fretboard, choose <N>Roots</N>, turn labels off, and name them out loud
        going up the neck. When that is easy, do it in a key with no open strings in it. Ten minutes of this is worth
        more than a week of scale patterns.
      </Aside>
    </>
  );
}
