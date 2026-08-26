"use client";

import { useEffect, useRef, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { KEYS, type Tonality } from "@/lib/music";
import { matchTuning, tuningOf } from "@/lib/tunings";

export type FoundChart = {
  root: number;
  tonality: Tonality;
  capo: number;
  /** How the degrees above were counted, so nothing has to guess later. */
  numbering: "relative-major" | "tonic";
  chart: { name: string; bars: string[] }[];
  tuning: string | null;
};

/**
 * Fetches a chord chart for the song that was chosen upstream.
 *
 * Roughly half of songs have one. The rest have a tab with no chord names on
 * it, which is not a failure worth dwelling on, so it says so in one line and
 * leaves you to type the chart as before.
 */
export default function ChartFinder({
  track,
  artist,
  auto,
  onFound,
}: {
  track: string;
  artist: string;
  auto?: string;
  onFound: (found: FoundChart) => void;
}) {
  const [state, setState] = useState<"idle" | "looking" | "none" | "gated" | "failed">("idle");
  const [took, setTook] = useState<string | null>(null);
  const [derived, setDerived] = useState(false);
  const ran = useRef<string | null>(null);

  const look = async () => {
    if (track.trim().length < 2) return;
    setState("looking");
    setTook(null);
    try {
      const session = (await getSupabase()?.auth.getSession())?.data.session;
      if (!session) {
        setState("gated");
        return;
      }
      const query = new URLSearchParams({ track, artist });
      const response = await fetch(`/api/chords?${query}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (response.status === 401) {
        setState("gated");
        return;
      }
      const body = (await response.json()) as {
        chart: Omit<FoundChart, "tuning"> | null;
        tuning?: number[] | null;
        derived?: boolean;
      };
      if (!body.chart) {
        setState("none");
        return;
      }
      const tuning = matchTuning(body.tuning);
      onFound({ ...body.chart, tuning });
      setTook(
        `${KEYS[body.chart.root]} ${body.chart.tonality}` +
          (body.chart.capo ? `, capo ${body.chart.capo}` : "") +
          (tuning && tuning !== "standard" ? `, ${tuningOf(tuning).name.toLowerCase()}` : "") +
          `, ${body.chart.chart.length} section${body.chart.chart.length === 1 ? "" : "s"}`,
      );
      setDerived(body.derived === true);
      setState("idle");
    } catch {
      setState("failed");
    }
  };

  useEffect(() => {
    if (!auto || ran.current === auto) return;
    ran.current = auto;
    void look();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto]);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        className="btn whitespace-nowrap"
        disabled={state === "looking" || track.trim().length < 2}
        title={track.trim().length < 2 ? "Give the song a title first" : undefined}
        onClick={look}
      >
        {state === "looking" ? "Looking…" : took ? "Fetch again" : "Fetch the chart"}
      </button>
      {took ? (
        <span className="text-[13px] leading-relaxed text-bone-dim">
          <b className="font-medium text-bone">{took}</b>.{" "}
          {derived
            ? "Nobody wrote the chords on this tab, so they were read off the notes. Worth checking against your ears."
            : "As the transcriber wrote them."}
        </span>
      ) : state === "none" ? (
        <span className="text-[13px] text-bone-dim">No chord chart for this one. Type it in below.</span>
      ) : state === "gated" ? (
        <span className="text-[13px] text-bone-dim">Sign in to fetch chord charts.</span>
      ) : state === "failed" ? (
        <span className="text-[13px] text-bone-dim">Could not reach it. Type the chart in below.</span>
      ) : null}
    </div>
  );
}
