"use client";

import { useState } from "react";
import { ArrowsClockwise, CheckCircle, CloudSlash, WarningCircle } from "@phosphor-icons/react";
import { useLibrary } from "@/hooks/useLibrary";
import { useSession } from "@/hooks/useSession";
import { useSync } from "@/hooks/useSync";
import { releaseLibrary } from "@/lib/songStore";
import { getSupabase, syncConfigured } from "@/lib/supabase";

/**
 * Signing in, and saying honestly where the data is. Everything on screen still
 * comes from the browser, so this only ever moves copies; nothing here is needed
 * for the app to work.
 */
export default function SyncPanel() {
  const { session, ready, problem: sessionProblem } = useSession();
  const library = useLibrary();
  const sync = useSync();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  if (!syncConfigured) {
    return (
      <section className="mt-5 rounded-xl border border-line bg-panel p-4" aria-label="Sync">
        <span className="label">Sync</span>
        <p className="mt-1.5 text-[13px] leading-relaxed text-bone-dim">
          Not set up on this deployment. The library works from browser storage alone.
        </p>
      </section>
    );
  }

  const send = async () => {
    const supabase = getSupabase();
    if (!supabase || !email.trim()) return;
    setSending(true);
    setFormError(null);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/account` },
    });
    setSending(false);
    if (error) setFormError(error.message);
    else setSent(email.trim());
  };

  const counts = `${library.own.length} song${library.own.length === 1 ? "" : "s"}, ${
    Object.keys(library.lyrics).length
  } set${Object.keys(library.lyrics).length === 1 ? "" : "s"} of words, ${library.sets.length} set${
    library.sets.length === 1 ? "" : "s"
  }`;

  return (
    <section className="mt-5 rounded-xl border border-line bg-panel p-4" aria-label="Sync">
      <span className="label">Sync</span>

      {session ? (
        <>
          {/* Status has to be honest: signed in is not the same as up to date. */}
          <p className="mt-2 flex flex-wrap items-center gap-2 text-[13.5px]">
            {sync.problem ? (
              <>
                <CloudSlash size={17} weight="bold" className="text-bone-dim" />
                <span className="text-bone">Not reaching the database</span>
              </>
            ) : sync.busy ? (
              <>
                <ArrowsClockwise size={17} weight="bold" className="text-bone-dim" />
                <span className="text-bone">Syncing</span>
              </>
            ) : sync.pending ? (
              <>
                <WarningCircle size={17} weight="bold" className="text-bone-dim" />
                <span className="text-bone">
                  {sync.pending} change{sync.pending === 1 ? "" : "s"} waiting to go up
                </span>
              </>
            ) : (
              <>
                <CheckCircle size={17} weight="fill" style={{ color: "var(--accent)" }} />
                <span className="text-bone">Everything is on the database</span>
              </>
            )}
          </p>

          <p className="mt-2 max-w-[70ch] text-[13px] leading-relaxed text-bone-dim">
            Signed in as <b className="font-medium text-bone">{session.user.email}</b>, holding {counts}. Changes go up
            a moment after you stop editing. The browser copy is what the app reads either way, so none of this needs a
            connection to play from.
          </p>

          {sync.problem ? (
            <p role="alert" className="mt-2 max-w-[70ch] text-[13px] leading-relaxed text-bone-dim">
              <b className="font-medium text-bone">{sync.problem}</b> Your work is safe in this browser and will go up
              on its own when the connection is back.
            </p>
          ) : null}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button type="button" className="chip flex items-center gap-2" disabled={sync.busy} onClick={sync.syncNow}>
              <ArrowsClockwise size={15} weight="bold" />
              {sync.busy ? "Syncing" : "Sync now"}
            </button>
            <button
              type="button"
              className="chip"
              onClick={() => {
                void getSupabase()?.auth.signOut();
                releaseLibrary();
                setSent(null);
              }}
            >
              Sign out
            </button>
            <span className="text-[13px] text-bone-dim">
              Signing out clears this browser&rsquo;s copy. Everything stays on the database and comes back when you
              sign in.
            </span>
          </div>
        </>
      ) : sent ? (
        <>
          <p className="mt-2 flex items-center gap-2 text-[13.5px] text-bone">
            <CheckCircle size={17} weight="fill" style={{ color: "var(--accent)" }} />
            Link sent to {sent}
          </p>
          <p className="mt-2 max-w-[70ch] text-[13px] leading-relaxed text-bone-dim">
            Open it on this device and you will land back here signed in. The link only works once, and only in the
            browser you open it in.
          </p>
          <button type="button" className="chip mt-3" onClick={() => setSent(null)}>
            Use a different address
          </button>
        </>
      ) : (
        <>
          <p className="mt-1.5 max-w-[70ch] text-[13px] leading-relaxed text-bone-dim">
            Sign in and your songs, words and sets follow you between devices. No password: you get a link by email.
            This browser is holding {counts}, which will come with you.
          </p>
          {!ready ? (
            <p className="mt-1.5 text-[12px] text-bone-dim">Checking whether you are already signed in&hellip;</p>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-2">
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && void send()}
              placeholder="you@example.com"
              aria-label="Email for the sign in link"
              aria-invalid={formError ? true : undefined}
              className="min-h-11 flex-1 rounded-[10px] border border-line bg-ink px-3 text-sm text-bone outline-none placeholder:text-bone-dim focus-visible:border-bone-dim"
            />
            <button type="button" className="chip" disabled={sending || !email.trim()} onClick={() => void send()}>
              {sending ? "Sending" : "Send me a link"}
            </button>
          </div>
          {formError ? (
            <p role="alert" className="mt-2 text-[13px] leading-relaxed text-bone-dim">
              {formError}
            </p>
          ) : null}
          {sessionProblem ? (
            <p role="alert" className="mt-2 text-[13px] leading-relaxed text-bone-dim">
              Could not reach the database: {sessionProblem}. The library still works from this browser.
            </p>
          ) : null}
        </>
      )}
    </section>
  );
}
