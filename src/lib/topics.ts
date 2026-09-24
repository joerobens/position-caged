import type { DrillSystem } from "./drills";

/**
 * What you are working on in Practice. One choice, and the screen follows from it.
 *
 * Each topic says whether it can be explored, drilled, or both. The clock is a
 * switch inside a topic rather than a mode of its own, and it only appears where
 * the topic has both sides: the neck and the keys have nothing to drill yet, and
 * a finger exercise is nothing without the clock.
 */
export type Topic = "neck" | "shapes" | "boxes" | "changes" | "keys" | "fingers";
export type Clock = "explore" | "drill";

export const TOPICS: {
  value: Topic;
  label: string;
  title: string;
  explore: boolean;
  drill: boolean;
  /** The drills that belong to it. */
  drills: DrillSystem | null;
  /** The theory page that explains it. */
  theory: string | null;
}[] = [
  { value: "neck", label: "Neck", title: "Roots, octaves and note names", explore: true, drill: false, drills: null, theory: "roots-and-octaves" },
  { value: "shapes", label: "Shapes", title: "The five CAGED shapes", explore: true, drill: true, drills: "chords", theory: "caged-cycle" },
  { value: "boxes", label: "Boxes", title: "The five pentatonic boxes and the runs between them", explore: true, drill: true, drills: "scales", theory: "pentatonics-and-blues" },
  { value: "changes", label: "Changes", title: "Follow the chords, aiming at each one's third", explore: true, drill: true, drills: "blues", theory: "following-the-changes" },
  { value: "keys", label: "Keys", title: "The chords of a key, on the wheel", explore: true, drill: false, drills: null, theory: "the-chord-wheel" },
  { value: "fingers", label: "Fingers", title: "Finger exercises. No key, no shapes", explore: false, drill: true, drills: "technique", theory: null },
];

export function topicOf(value: Topic) {
  return TOPICS.find((entry) => entry.value === value) ?? TOPICS[1];
}

export function isTopic(value: string | null | undefined): value is Topic {
  return TOPICS.some((entry) => entry.value === value);
}

/** The clock a topic actually runs with: your choice where it has one, its only side where it does not. */
export function clockFor(topic: Topic, clock: Clock): Clock {
  const entry = topicOf(topic);
  if (!entry.drill) return "explore";
  if (!entry.explore) return "drill";
  return clock;
}
