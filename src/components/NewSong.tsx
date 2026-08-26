"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import SongForm from "@/components/SongForm";
import { useLibrary } from "@/hooks/useLibrary";
import { addSong, setLyrics, slugify } from "@/lib/songStore";

export default function NewSong() {
  const library = useLibrary();
  const router = useRouter();
  // Held here until the song exists, because lyrics are keyed by its slug.
  const [lyrics, setLyrics_] = useState("");

  return (
    <main className="mx-auto w-full max-w-[820px] px-[var(--gutter)] py-7 pb-16">
      <Link href="/songs" className="-my-2 inline-flex min-h-11 items-center text-[13px] text-bone-dim hover:text-bone">
        &larr; Songs
      </Link>
      <h1 className="mt-3 text-[22px] font-medium tracking-tight">Add a song</h1>
      <p className="mt-2 max-w-[70ch] text-[14px] leading-relaxed text-bone-dim">
        The chart and the words together. Both stay in this browser, and sync to the database if you are signed in.
      </p>
      <div className="mt-5">
        <SongForm
          submitLabel="Save the song"
          lyrics={lyrics}
          onLyrics={setLyrics_}
          onSave={(song) => {
            const slug = slugify(song.title, library);
            addSong({ ...song, slug });
            if (lyrics.trim()) setLyrics(slug, lyrics);
            router.push(`/songs/${slug}`);
          }}
        />
      </div>
    </main>
  );
}
