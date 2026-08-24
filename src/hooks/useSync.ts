"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLibrary } from "@/hooks/useLibrary";
import { useSession } from "@/hooks/useSession";
import { pendingCount } from "@/lib/songStore";
import { syncConfigured } from "@/lib/supabase";
import { syncLibrary, type SyncResult } from "@/lib/sync";

export type SyncState = {
  /** Signed in, so there is somewhere to sync to. */
  active: boolean;
  /** Rows changed here that the database has not got yet. */
  pending: number;
  busy: boolean;
  problem: string | null;
  last: SyncResult | null;
  email: string | null;
  syncNow: () => void;
};

const SETTLE_MS = 1500;

/**
 * Keeps the database in step with the browser.
 *
 * Sync used to run once at sign in and then only when pressed, which meant every
 * edit after that stayed on the device while the nav claimed to be synced. It now
 * runs a moment after you stop typing, and retries when the connection comes
 * back, so "synced" is either true or visibly not.
 */
export function useSync(): SyncState {
  const { session } = useSession();
  const library = useLibrary();
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [last, setLast] = useState<SyncResult | null>(null);
  const timer = useRef<number | null>(null);
  const running = useRef(false);

  const userId = session?.user.id ?? null;
  const pending = userId ? pendingCount(library) : 0;

  const run = useCallback(async () => {
    if (!userId || running.current) return;
    running.current = true;
    setBusy(true);
    try {
      setLast(await syncLibrary(userId));
      setProblem(null);
    } catch (error) {
      setProblem(error instanceof Error ? error.message : "Could not reach the database.");
    } finally {
      running.current = false;
      setBusy(false);
    }
  }, [userId]);

  // Once on sign in, then a moment after each change settles.
  useEffect(() => {
    if (!userId) return;
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => void run(), pending ? SETTLE_MS : 0);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [userId, pending, run]);

  // Anything that failed offline gets another go when the connection returns.
  useEffect(() => {
    if (!userId) return;
    const retry = () => void run();
    window.addEventListener("online", retry);
    return () => window.removeEventListener("online", retry);
  }, [userId, run]);

  return {
    active: Boolean(syncConfigured && userId),
    pending,
    busy,
    problem,
    last,
    email: session?.user.email ?? null,
    syncNow: () => void run(),
  };
}
