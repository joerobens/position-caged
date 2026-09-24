"use client";

import { useRef, useState } from "react";
import { DownloadSimple, UploadSimple } from "@phosphor-icons/react";
import { useLibrary } from "@/hooks/useLibrary";
import { addSong, findSet, getSnapshot, nextSetId, saveSet, setLyrics } from "@/lib/songStore";
import { ICON } from "@/lib/icons";

/** A file you can carry, whether or not you sign in. */
export default function LibraryBackup() {
  const library = useLibrary();
  const input = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string | null>(null);
  const songs = library.own.length;
  const words = Object.keys(library.lyrics).length;
  const sets = library.sets.length;

  const save = () => {
    const blob = new Blob([JSON.stringify(library, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "position-songs.json";
    link.click();
    URL.revokeObjectURL(url);
    setMessage(`Saved ${songs} song${songs === 1 ? "" : "s"}, words for ${words}, and ${sets} set${sets === 1 ? "" : "s"}.`);
  };

  const load = async (file: File) => {
    try {
      const parsed = JSON.parse(await file.text()) as Partial<typeof library>;
      let added = 0;
      for (const song of parsed.own ?? []) {
        addSong(song);
        added++;
      }
      let pasted = 0;
      for (const [slug, text] of Object.entries(parsed.lyrics ?? {})) {
        setLyrics(slug, text);
        pasted++;
      }
      // Set ids are counted per browser, so one from a file can already belong to
      // a different set here. That one keeps its id and the incoming set takes a new one.
      let listed = 0;
      for (const set of parsed.sets ?? []) {
        const clash = findSet(getSnapshot(), set.id);
        saveSet(clash && clash.name !== set.name ? { ...set, id: nextSetId(getSnapshot()) } : set);
        listed++;
      }
      setMessage(
        `Brought in ${added} song${added === 1 ? "" : "s"}, words for ${pasted}, and ${listed} set${listed === 1 ? "" : "s"}.`,
      );
    } catch {
      setMessage("That file could not be read. It needs to be one this button made.");
    }
  };

  return (
    <div className="mt-5 rounded-xl border border-line bg-panel p-4">
      <span className="label">Backup</span>
      <p className="mt-1.5 max-w-[70ch] text-[13px] leading-relaxed text-bone-dim">
        A file copy of your songs, words and sets, to keep somewhere safe or bring into another browser.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="button" className="btn flex items-center gap-2" onClick={save} disabled={!songs && !words && !sets}>
          <DownloadSimple size={ICON.sm} weight="bold" />
          Save a copy
        </button>
        <button type="button" className="btn flex items-center gap-2" onClick={() => input.current?.click()}>
          <UploadSimple size={ICON.sm} weight="bold" />
          Bring one in
        </button>
        <input
          ref={input}
          type="file"
          accept="application/json,.json"
          aria-label="Choose a backup file"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void load(file);
            event.target.value = "";
          }}
        />
        {message ? <span className="text-[13px] text-bone-dim">{message}</span> : null}
      </div>
    </div>
  );
}
