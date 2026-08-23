import TheoryNeck from "@/components/TheoryNeck";
import { Aside, B, H, P, Table } from "./Prose";

const C = { root: 0, offset: 0, name: "C", roman: "I" };
const F = { root: 5, offset: 5, name: "F", roman: "IV" };

export default function FollowingTheChanges() {
  return (
    <>
      <P>
        Most players learn one pentatonic box, find it works over a whole blues, and stop. It does work, in the sense
        that nothing you play will be wrong. It also means every bar sounds the same, because you are playing the key
        rather than the chord.
      </P>
      <P>
        The alternative is to follow the changes: let the chord under you decide what you are aiming at. In a C blues
        the chords are C, F and G, and each one has a different note at its centre.
      </P>

      <H>The target is the third</H>
      <P>
        A triad is a root, a third and a fifth. The root tells you which chord it is and the fifth is nearly neutral,
        but the third is the note carrying the chord&rsquo;s character. Land on it and the listener hears the chord,
        not the scale.
      </P>
      <Table
        head={["Chord", "Its third", "Which degree of C that is"]}
        rows={[
          ["C, the 1", "E", "the 3"],
          ["F, the 4", "A", "the 6"],
          ["G, the 5", "B", "the 7"],
        ]}
      />
      <P>
        Read that third column again, because it is the whole argument. If you sit in C and keep aiming at the 3, you
        are aiming at E, which is right over the C and merely passable over the other two. The target moves and the
        box cannot tell you that.
      </P>

      <H>The same hand position, two different chords</H>
      <P>
        You do not have to chase the chords around the neck. Stand in one place and let them come to you: each chord
        has a shape near where you already are.
      </P>
      <TheoryNeck
        root={0}
        chord={C}
        shape="A"
        scale="Blues blend"
        caption="Bar one, the C chord. The filled dot with a ring standing off it is the third, the note to aim at. Dashed dots are the half step either side."
      />
      <TheoryNeck
        root={0}
        chord={F}
        shape="A"
        scale="Blues blend"
        caption="Bar five, the F chord, hand in the same place. The target has moved and the numbers are counted from F now, so the third still reads 3."
      />

      <H>Approaching it</H>
      <P>
        Landing straight on the third is fine. Sliding into it is better, and it is most of what makes a blues line
        sound played rather than typed. There are two notes a semitone away from any third: the one below, which is the
        minor third and the classic blue note, and the one above, which is the fourth. Both work, and the app marks
        them dashed because you pass through them rather than stop on them.
      </P>

      <H>Where to stand</H>
      <P>
        The five CAGED positions give you five regions, and every chord in the progression has a shape in each one.
        Learn the changes in one region until they are automatic, then move up and do it again. That is the drill, and
        it is why the tool asks you for a region rather than a chord shape when it is following a form.
      </P>
      <Table
        head={["Standing at", "The 1 is", "The 4 is", "The 5 is"]}
        rows={[
          ["the nut", "C shape", "E shape at 1", "G shape"],
          ["fret 3", "A shape", "D shape", "E shape"],
          ["fret 5", "G shape", "C shape", "D shape"],
          ["fret 8", "E shape", "A shape", "C shape at 7"],
          ["fret 10", "D shape", "G shape", "A shape"],
        ]}
      />

      <Aside>
        <B>What a diagram cannot give you.</B> The notes are the easy half. Hammering on into the target instead of
        picking it, a grace note just before it, a rake across the muted strings on the way in, playing loud then
        quiet, using your fingers as well as the pick: none of that is on the screen and all of it is the difference
        between the right notes and the right sound.
      </Aside>
    </>
  );
}
