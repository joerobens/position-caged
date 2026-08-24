"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowsClockwise } from "@phosphor-icons/react";
import { useLibrary } from "@/hooks/useLibrary";
import { useSession } from "@/hooks/useSession";
import { getSupabase, syncConfigured } from "@/lib/supabase";
import { syncLibrary } from "@/lib/sync";

/**
 * Signing in and syncing. Everything on screen still comes from the browser, so
 * this only ever moves copies around; nothing here is required for the app to
 * work, which is the point.
 */
export default function SyncPanel() {
  const { session, ready, problem } = useSession();
  const library = useLibrary();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const ranFor = useRef<string | null>(null);

  const run = useCallback(
    async (userId: string, quiet: boolean) => {
      setBusy(true);
      try {
        const result = await syncLibrary(userId);
        if (!quiet || result.pulled || result.pushed) {
          setMessage(`Brought down ${result.pulled}, sent up ${result.pushed}.`);
        }
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Sync failed.");
      } finally {
        setBusy(false);
      }
    },
    [],
  );

  // Once on sign in, so a device that has been away catches up by itself.
  useEffect(() => {
    const id = session?.user.id;
    if (!id || ranFor.current === id) return;
    ranFor.current = id;
    void run(id, true);
  }, [session, run]);

  if (!syncConfigured) {
    return (
      <div className="mt-5 rounded-xl border border-line bg-panel p-4">
        <span className="label">Sync</span>
        <p className="mt-1.5 text-[13px] leading-relaxed text-bone-dim">
          Not configured on this deployment. The library works from browser storage alone.
        </p>
      </div>
    );
  }

  const send = async () => {
    const supabase = getSupabase();
    if (!supabase || !email.trim()) return;
    setBusy(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.href },
    });
    setBusy(false);
    setMessage(error ? error.message : "Check your email. The link signs you in on this device.");
  };

  return (
    <div className="mt-5 rounded-xl border border-line bg-panel p-4">
      <span className="label">Sync</span>
      {problem ? (
        <p className="mt-1.5 text-[13px] leading-relaxed text-bone-dim">
          Could not reach the database: <b className="font-medium text-bone">{problem}</b>. Everything still works from
          this browser.
        </p>
      ) : null}
      {/*
        Not signed in is the common case and the one with something to do, so the
        form is what renders while the session resolves. A spinner here reads as
        "this feature is missing", which is exactly how it was read.
      */}
      {session ? (
        <>
          <p className="mt-1.5 max-w-[70ch] text-[13px] leading-relaxed text-bone-dim">
            Signed in as <b className="font-medium text-bone">{session.user.email}</b>. Your{" "}
            {library.own.length} song{library.own.length === 1 ? "" : "s"}, {Object.keys(library.lyrics).length} set
            {Object.keys(library.lyrics).length === 1 ? "" : "s"} of words and {library.sets.length} set
            {library.sets.length === 1 ? "" : "s"} sync to the database. The browser copy is still what the app reads,
            so none of this needs a connection to play from.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="chip flex items-center gap-2"
              disabled={busy}
              onClick={() => void run(session.user.id, false)}
            >
              <ArrowsClockwise size={15} weight="bold" />
              {busy ? "Syncing" : "Sync now"}
            </button>
            <button
              type="button"
              className="chip"
              onClick={() => {
                void getSupabase()?.auth.signOut();
                setMessage(null);
              }}
            >
              Sign out
            </button>
            {message ? <span className="text-[13px] text-bone-dim">{message}</span> : null}
          </div>
        </>
      ) : (
        <>
          <p className="mt-1.5 max-w-[70ch] text-[13px] leading-relaxed text-bone-dim">
            Sign in and your songs, words and sets follow you between devices. No password: you get a link by email.
          </p>
          {!ready ? <p className="mt-1.5 text-[12px] text-bone-dim">Checking whether you are already signed in&hellip;</p> : null}
          <div className="mt-3 flex flex-wrap gap-2">
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && void send()}
              placeholder="you@example.com"
              aria-label="Email for the sign in link"
              className="min-h-11 flex-1 rounded-[10px] border border-line bg-ink px-3 text-sm text-bone outline-none placeholder:text-bone-dim focus-visible:border-bone-dim"
            />
            <button type="button" className="chip" disabled={busy || !email.trim()} onClick={() => void send()}>
              {busy ? "Sending" : "Send me a link"}
            </button>
          </div>
          {message ? <p className="mt-2 text-[13px] leading-relaxed text-bone-dim">{message}</p> : null}
        </>
      )}
    </div>
  );
}
