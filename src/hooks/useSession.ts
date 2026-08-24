"use client";

import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { getSupabase, syncConfigured } from "@/lib/supabase";

/** Who is signed in, if anyone. Null while we are still finding out. */
export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(!syncConfigured);

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) return;
    let live = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!live) return;
      setSession(data.session);
      setReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      if (live) setSession(next);
    });
    return () => {
      live = false;
      data.subscription.unsubscribe();
    };
  }, []);

  return { session, ready };
}
