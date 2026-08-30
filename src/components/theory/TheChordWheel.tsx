"use client";

import { useState } from "react";
import ChordWheel from "@/components/ChordWheel";
import { KEYS, type Tonality } from "@/lib/music";
import { familyOn, positionOf } from "@/lib/wheel";
import { Aside, B, H, N, P } from "./Prose";

export default function TheChordWheel() {
  const [root, setRoot] = useState(0);
  const [tonality, setTonality] = useState<Tonality>("major");
  const family = familyOn(positionOf(root, tonality));

  return (
    <>
      <P>
        The chords of a key can be worked out from its scale, one triad at a time. They can also just be read off a
        wheel, and the wheel is worth having because it shows you something the list does not: <B>why</B> those
        particular chords belong together.
      </P>

      <H>Turn it</H>
      <P>
        Every key on the outside is a fifth from the one before it, and every relative minor sits directly inside its
        major. Tap anything to move the wheel there.
      </P>

      <div className="my-6 flex flex-col items-start gap-5 sm:flex-row sm:items-center">
        <ChordWheel
          root={root}
          tonality={tonality}
          onPick={(nextRoot, nextTonality) => {
            setRoot(nextRoot);
            setTonality(nextTonality);
          }}
        />
        <div className="min-w-[200px]">
          <span className="label">
            {KEYS[root]} {tonality}
          </span>
          <ul className="mt-2 flex flex-col gap-1">
            {family.map((chord) => (
              <li key={`${chord.at}:${chord.ring}`} className="flex items-baseline gap-2 text-[14px]">
                <span className="w-8 font-mono text-[13px] text-bone-dim">{chord.roman}</span>
                <span className="w-10 font-mono text-[13px]" style={{ color: "var(--accent)" }}>
                  {chord.degree}
                </span>
                <span className="text-bone">{chord.name}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <H>Three slices, not six chords</H>
      <P>
        The six chords of a key are never scattered around the wheel. They are always three touching slices: the key
        itself, its neighbour on each side, and the three minors underneath them. That is the whole picture, and it is
        the same picture in every key.
      </P>
      <P>
        So <B>F</B>, <B>C</B> and <B>G</B> go together not because somebody decided they sound nice, but because they
        are next to each other on a wheel of fifths, and neighbouring keys share all but one note. Move one notch
        clockwise and every chord moves with you: the shape of the family never changes, only its position.
      </P>

      <Aside>
        A major key and the minor key inside it have the same six chords, because they are the same six slices. C major
        and A minor are one position on this wheel, read from two different homes, which is exactly why a chart in a
        minor key is numbered from its relative major.
      </Aside>

      <H>What it is for</H>
      <P>
        Working a song out, the wheel tells you where to look first: the chord you cannot name is nearly always one of
        the five sitting next to the one you are on. Writing one, it tells you what is available before you go looking
        outside the key. And transposing, it is the whole job: find the new key, and every chord keeps its place.
      </P>
      <P>
        The seventh chord of a key, the diminished one, has no slice. It is built on the note that does not belong to
        any neighbouring key, which is another way of saying the same thing the <N>7°</N> always says: it is the odd one
        out.
      </P>
    </>
  );
}
