"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/** A panel that hangs off a button and goes away when you tap anywhere else. */
export default function Popover({
  label,
  button,
  children,
  className = "",
  buttonClassName = "",
}: {
  label: string;
  /** Extra classes for the button itself, when it has to sit quieter or louder. */
  buttonClassName?: string;
  button: (open: boolean) => ReactNode;
  /** Or a function, given a way to close it once a choice is made. */
  children: ReactNode | ((close: () => void) => ReactNode);
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (event: PointerEvent) => {
      if (!wrap.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={wrap} className="relative">
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className={`flex min-h-11 items-center gap-2.5 rounded-[10px] border border-line bg-panel px-3.5 text-bone transition-colors hover:border-bone-dim focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bone ${buttonClassName}`}
      >
        {button(open)}
      </button>
      {open ? (
        <div
          className={`absolute left-0 top-[calc(100%+8px)] z-40 flex w-[min(380px,calc(100vw-32px))] flex-col gap-3 rounded-2xl border border-line bg-panel p-3.5 shadow-lg shadow-black/30 ${className}`}
        >
          {typeof children === "function" ? children(() => setOpen(false)) : children}
        </div>
      ) : null}
    </div>
  );
}
