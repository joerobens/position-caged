/**
 * Turning a chord into notes you can hear.
 *
 * Low root, then the third and fifth above it, then the root again on top.
 * Deliberately plain: this is a backing part, and anything more voiced would
 * start competing with what you are playing over it. The register sits under
 * the guitar so the two do not fight for the same air.
 */
export function voice(root: number, minor: boolean, seventh = false): number[] {
  // Root around the open A string, which keeps every chord in one octave band
  // rather than leaping about as the progression moves.
  const bass = 45 + ((root - 9 + 12) % 12);
  const third = bass + (minor ? 3 : 4);
  const fifth = bass + 7;
  const notes = [bass, third, fifth, bass + 12];
  if (seventh) notes.splice(3, 0, bass + (minor ? 10 : 10));
  return notes;
}
