import TheoryNeck from "@/components/TheoryNeck";
import { Aside, B, H, N, P, Table } from "./Prose";

export default function PentatonicsAndBlues() {
  return (
    <>
      <P>
        A pentatonic scale is a major scale with the two awkward notes removed. That is all it is, and it is why it is
        so forgiving: the notes most likely to clash are simply not there.
      </P>
      <Table
        head={["Scale", "Degrees", "In C"]}
        rows={[
          ["Major", "1 2 3 4 5 6 7", "C D E F G A B"],
          ["Major pentatonic", "1 2 3 5 6", "C D E G A"],
          ["Minor pentatonic", "1 ♭3 4 5 ♭7", "C E♭ F G B♭"],
          ["Minor blues", "1 ♭3 4 ♭5 5 ♭7", "C E♭ F G♭ G B♭"],
        ]}
      />
      <P>
        Drop the 4 and the 7 from a major scale and you have the major pentatonic. Those two are the notes a semitone
        away from a chord tone, so removing them removes the friction. The minor pentatonic is the same five-note idea
        built on the minor third, and the blues scale is that with a ♭5 slipped in as a passing note.
      </P>

      <H>Up major, down minor</H>
      <P>
        Blues playing does not pick one. The trick, and it is the single most useful thing in this page, is to ascend
        with the major pentatonic, descend with the minor, and resolve to the major third. Most players believe a song
        is either major or minor. Blues is both at once, and that ambiguity is the sound.
      </P>
      <P>
        Put both scales together and you get eight notes: <N>1 2 ♭3 3 4 5 6 ♭7</N>. The app calls it the blues blend.
      </P>
      <TheoryNeck
        root={0}
        shape="A"
        scale="Blues blend"
        caption="C blues blend around the A shape. The ♭3 and the 3 are the two dots sitting a fret apart, and sliding between them is most of the vocabulary."
      />
      <P>
        That adjacent pair is the whole thing. The ♭3 leaning into the 3 is the blues move, and it is why this scale
        sounds like the music while a plain minor pentatonic over a major chord sounds like someone practising.
      </P>

      <H>The one that is not the same</H>
      <P>
        Worth being clear about, because the names collide. The app&rsquo;s <N>Blues</N> scale is the minor blues, six
        notes with the ♭5. The <N>Blues blend</N> is the eight note major-and-minor hybrid. They are different scales
        for different jobs: the first is the gritty one, the second is the one that follows the chords.
      </P>

      <Aside>
        <B>How to practise it.</B> Put the drone on the root, play the blend slowly, and stop on each note long enough
        to hear what it does. The ♭3 and the 3 will sound completely different from each other over that drone, and
        once you have heard that you will stop treating them as interchangeable.
      </Aside>
    </>
  );
}
