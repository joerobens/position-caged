import TheoryNeck from "@/components/TheoryNeck";
import { Aside, B, Chart, H, N, P, Table } from "./Prose";

// The same degree, the four, in two different keys.
const FOUR_IN_C = { root: 5, offset: 5, name: "F", roman: "IV" };
const FOUR_IN_G = { root: 0, offset: 5, name: "C", roman: "IV" };

export default function NashvilleNumbers() {
  return (
    <>
      <P>
        A number chart writes a song in scale degrees instead of chord names. The tonic is always <N>1</N>, so in the
        key of C the <N>1</N> is C and in the key of G it is G, and the chart itself never changes. That is the whole
        point of it: when the singer wants the song a tone lower, nobody rewrites anything.
      </P>
      <P>
        It came out of the Jordanaires, a Nashville vocal group doing three or four sessions a day in the late 1950s
        with only lyrics in front of them. Neal Matthews Jr. worked out the numbering, Charlie McCoy pushed it further,
        and the session players turned it into the chart system. Chas Williams published the book in 1988.
      </P>

      <H>The seven chords</H>
      <P>
        Number the major scale and you get the chords that live in the key. Three are major, three are minor, and the
        seventh is diminished and barely ever used. In C:
      </P>
      <Table
        head={["Number", "In C", "Quality"]}
        rows={[
          ["1", "C", "major"],
          ["2-", "D minor", "minor"],
          ["3-", "E minor", "minor"],
          ["4", "F", "major"],
          ["5", "G", "major"],
          ["6-", "A minor", "minor"],
          ["7°", "B diminished", "diminished, and rare"],
        ]}
      />
      <P>
        A bare number is major. A dash after it makes it minor. Those two rules cover most of every chart you will ever
        see, and a great many songs are nothing but <N>1</N>, <N>4</N> and <N>5</N>.
      </P>

      <P>
        Here is the same degree twice. Both diagrams show the <N>4</N>, and in both the numbers on the dots read the
        same, because they are counted from the chord. Only the letters underneath change.
      </P>
      <TheoryNeck
        root={0}
        chord={FOUR_IN_C}
        shape="A"
        caption="The four of C, which is F. The filled dots are its chord tones and the numbers count from F."
      />
      <TheoryNeck
        root={7}
        chord={FOUR_IN_G}
        shape="A"
        caption="The four of G, which is C. A different key, a different chord, the same shape of thing, and a chart written in numbers does not have to be rewritten to say so."
      />

      <H>Everything else</H>
      <P>
        Chords from outside the key get an accidental in front of the number. Qualities and extensions go after it.
        This app reads all of the following.
      </P>
      <Table
        head={["Written", "Means", "In C"]}
        rows={[
          ["♭7", "flatten the degree", "B♭"],
          ["♯4", "sharpen the degree", "F♯"],
          ["5-", "minor", "G minor"],
          ["57", "dominant seventh", "G7"],
          ["4Δ", "major seventh", "Fmaj7"],
          ["2-7", "minor seventh", "Dm7"],
          ["7°", "diminished", "Bdim"],
          ["♯4°7", "diminished seventh", "F♯dim7"],
          ["1+", "augmented", "Caug"],
          ["5sus", "suspended fourth", "Gsus4"],
          ["1/3", "an inversion, third in the bass", "C/E"],
          ["4/5", "F over a G bass", "F/G"],
        ]}
      />
      <P>
        The accidental signs are the real ones, <N>♭</N> and <N>♯</N>, but a plain <N>b</N> and <N>#</N> are read the
        same way here because they are what a keyboard produces. Convention leans on sharps when a chord is walking up,
        as in <N>1</N> to <N>♯1°</N>, and flats otherwise.
      </P>

      <H>Minor keys are numbered from the relative major</H>
      <P>
        This is the part that catches people, and the app used to get it wrong. A song in A minor is normally written
        in the numbers of C, its relative major, so the A minor chord you keep landing on is written <N>6-</N> rather
        than <N>1-</N>. Where a major key song leans on <N>1</N>, <N>4</N> and <N>5</N>, a minor key song leans on{" "}
        <N>6-</N>, <N>2-</N> and <N>3</N>.
      </P>
      <P>
        The <N>3</N> there is worth a second look. In A minor it is E, and it is usually played major even though the
        key says it should be minor, because it is doing the job the <N>5</N> does in a major key: pulling you home.
      </P>
      <Chart
        lines={[["6-", "6-", "2-", "6-"], ["6-", "1", "3", "6-"]]}
        caption="Wayfaring Stranger in A minor, written the usual way. The chords are Am Am Dm Am, Am C E Am."
      />
      <P>
        You <B>can</B> write it as <N>1-</N>, <N>4-</N>, <N>5</N> instead, counting from the minor tonic, and this app
        will read a chart marked that way. It is just that most players reading over your shoulder will expect the
        first version, so that is what the library uses.
      </P>

      <H>Bars and time</H>
      <P>
        Every bar gets a number, so the chart tells you when to change. Four bars to a line reads easily; eight is
        common for eight bar phrases, usually with a gap between the fourth and fifth. A twelve bar blues is twelve
        numbers.
      </P>
      <Chart
        lines={[["1", "1", "1", "1"], ["4", "4", "1", "1"], ["5", "4", "1", "5"]]}
        caption="The twelve bar blues. Three lines of four, which is how you would write it out by hand."
      />
      <P>
        Two chords in one bar is a <B>split bar</B>, written underlined on paper and with both numbers inside the same
        bar here. If the split is uneven, the rhythm gets written above it. A <B>diamond</B> round a number means let
        it ring, usually a whole bar. A <N>&gt;</N> or <N>ˇ</N> above a chord is a <B>push</B>: come in an eighth note
        early. Repeat signs, first and second endings, fermatas and codas all appear on number charts too, because the
        people who invented the system could read notation perfectly well and only wanted a faster way to write a
        chart.
      </P>

      <Aside>
        <B>What this app does not read yet.</B> Diamonds, pushes, uneven split rhythms, repeats and endings are all
        real notation and none of it is supported. A bar here is a chord and nothing more, and a held bar is written{" "}
        <N>%</N>. If you are copying a chart in, that detail lives in your hands rather than on the screen.
      </Aside>

      <H>Why it is worth learning</H>
      <P>
        Because it is the same idea the fretboard tool is built on. A degree is a relationship rather than a note, and
        once a song is stored as relationships you can move it anywhere. Learn a chart as <N>1 4 5</N> and you have
        learned it in twelve keys. Learn it as G, C, D and you have learned it in one.
      </P>

    </>
  );
}
