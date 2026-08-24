"use client";

import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { getSupabase, syncConfigured } from "@/lib/supabase";

/** Who is signed in, if anyone. Null while we are still finding out. */
export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(!syncConfigured);
  const [problem, setProblem] = useState<string | null>(null);

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) return;
    let live = true;

    // Whatever happens, stop saying "checking". Sitting on that forever is worse
    // than an error, because it looks like the feature simply is not there.
    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!live) return;
        if (error) setProblem(error.message);
        setSession(data.session);
      })
      .catch((error: unknown) => {
        if (live) setProblem(error instanceof Error ? error.message : "Could not reach the database.");
      })
      .finally(() => {
        if (live) setReady(true);
      });
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      if (live) setSession(next);
    });
    return () => {
      live = false;
      data.subscription.unsubscribe();
    };
  }, []);

  return { session, ready, problem };
}
