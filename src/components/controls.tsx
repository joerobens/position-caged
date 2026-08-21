"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Info as InfoIcon } from "@phosphor-icons/react";

/**
 * The explainer next to a control. Opens on hover for a mouse and on tap for the
 * iPad, which has no hover at all, so it cannot be hover-only.
 */
export function Info({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLSpanElement>(null);
  const id = useId();

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
    <span
      ref={wrap}
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        aria-label="What this does"
        aria-expanded={open}
        aria-describedby={open ? id : undefined}
        onClick={() => setOpen((current) => !current)}
        className="flex size-5 items-center justify-center rounded-full text-bone-dim transition-colors hover:text-bone focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bone"
      >
        <InfoIcon size={15} weight="bold" />
      </button>
      {open ? (
        <span
          id={id}
          role="tooltip"
          className="absolute left-1/2 top-7 z-30 w-[min(280px,calc(100vw-40px))] -translate-x-1/2 rounded-xl border border-line bg-panel p-3 text-xs leading-relaxed font-normal normal-case tracking-normal text-bone shadow-lg shadow-black/40"
        >
          {text}
        </span>
      ) : null}
    </span>
  );
}

export function Field({
  label,
  info,
  action,
  children,
  className = "",
}: {
  label: string;
  info?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <span className="label flex items-center gap-1.5">
        {label}
        {info ? <Info text={info} /> : null}
        {action ? <span className="ml-auto">{action}</span> : null}
      </span>
      {children}
    </div>
  );
}

type Option<T> = { value: T; label: string; title?: string };

export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
}) {
  return (
    <div className="segmented w-fit max-w-full flex-wrap" role="group" aria-label={ariaLabel}>
      {options.map((option) => (
        <button
          key={String(option.value)}
          type="button"
          aria-pressed={option.value === value}
          title={option.title}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function ChipGroup<T extends string | number>({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
}) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label={ariaLabel}>
      {options.map((option) => (
        <button
          key={String(option.value)}
          type="button"
          className="chip"
          aria-pressed={option.value === value}
          title={option.title}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function Toggle({
  on,
  onChange,
  children,
  ariaLabel,
}: {
  on: boolean;
  onChange: (on: boolean) => void;
  children: ReactNode;
  ariaLabel?: string;
}) {
  return (
    <button type="button" className="chip" aria-pressed={on} aria-label={ariaLabel} onClick={() => onChange(!on)}>
      {children}
    </button>
  );
}

export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  display,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  display: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between">
        <span className="label">{label}</span>
        <span className="font-mono text-xs text-bone-dim">{display}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-label={label}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </div>
  );
}
