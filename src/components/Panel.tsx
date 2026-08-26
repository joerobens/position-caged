"use client";

import type { ReactNode } from "react";
import { CaretDown } from "@phosphor-icons/react";
import { useSettings } from "@/hooks/useSettings";
import { ICON } from "@/lib/icons";

/**
 * A panel you can fold away.
 *
 * A song page carries several answers to several questions, and which of them
 * you want depends on whether you are learning the song or playing it. Folding
 * is remembered rather than reset each time, because that preference is about
 * you rather than about the song.
 */
export default function Panel({
  id,
  label,
  aside,
  children,
  defaultOpen = true,
}: {
  id: string;
  label: string;
  /** Anything that belongs on the header line beside the title. */
  aside?: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const { settings, update } = useSettings();
  const stored = settings.songPanels?.[id];
  const open = stored === undefined ? defaultOpen : stored;

  return (
    <section className="panel mt-5" aria-label={label}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <button
          type="button"
          className="-my-1 flex min-h-11 items-center gap-2 text-left"
          aria-expanded={open}
          onClick={() => update({ songPanels: { ...settings.songPanels, [id]: !open } })}
        >
          <CaretDown
            size={ICON.sm}
            weight="bold"
            className="flex-none text-bone-dim transition-transform"
            style={{ transform: open ? "none" : "rotate(-90deg)" }}
          />
          <span className="label">{label}</span>
        </button>
        {open ? aside : null}
      </div>
      {open ? children : null}
    </section>
  );
}
