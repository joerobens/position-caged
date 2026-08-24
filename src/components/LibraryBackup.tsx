"use client";

import { useRef, useState } from "react";
import { DownloadSimple, UploadSimple } from "@phosphor-icons/react";
import { useLibrary } from "@/hooks/useLibrary";
import { addSong, setLyrics } from "@/lib/songStore";

/**
 * The library lives in one browser and nowhere else, so it is one cleared cache
 * away from gone. Until there is a database behind this, a file you can carry is
 * the whole backup story.
 */
export default function LibraryBackup() {
  const library = useLibrary();
  const input = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string | null>(null);
  const songs = library.own.length;
  const words = Object.keys(library.lyrics).length;

  const save = () => {
    const blob = new Blob([JSON.stringify(library, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "position-songs.json";
    link.click();
    URL.revokeObjectURL(url);
    setMessage(`Saved ${songs} song${songs === 1 ? "" : "s"} and ${words} set${words === 1 ? "" : "s"} of words.`);
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
      setMessage(`Brought in ${added} song${added === 1 ? "" : "s"} and ${pasted} set${pasted === 1 ? "" : "s"} of words.`);
    } catch {
      setMessage("That file could not be read. It needs to be one this button made.");
    }
  };

  return (
    <div className="mt-5 rounded-xl border border-line bg-panel p-4">
      <span className="label">Backup</span>
      <p className="mt-1.5 max-w-[70ch] text-[13px] leading-relaxed text-bone-dim">
        Your songs and words are in this browser only. Clearing site data loses them, and they do not follow you to
        another device. Carry a file across until there is a database behind this.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="button" className="chip flex items-center gap-2" onClick={save} disabled={!songs && !words}>
          <DownloadSimple size={15} weight="bold" />
          Save a copy
        </button>
        <button type="button" className="chip flex items-center gap-2" onClick={() => input.current?.click()}>
          <UploadSimple size={15} weight="bold" />
          Bring one in
        </button>
        <input
          ref={input}
          type="file"
          accept="application/json,.json"
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
