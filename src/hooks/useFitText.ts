"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

/**
 * Sizes text so all of it fits its box at once, as large as it can be.
 *
 * On the stand the words are a cue, not something to read line by line, so the
 * whole song has to be there at a glance: no scrolling, no pages to turn. The
 * type finds its own size, and the column count is chosen with it, because a
 * long song in landscape reads larger in three columns than squeezed into two.
 *
 * For each column count on offer it binary-searches the size, measuring the
 * real element rather than a copy, since the answer depends on how the text
 * actually wraps and balances. The largest size wins; on a tie, fewer columns.
 * About six passes a count, in a layout effect, so it settles before the
 * browser paints and never flickers.
 */
export function useFitText<T extends HTMLElement>({
  enabled,
  min,
  max,
  columns,
  deps,
}: {
  enabled: boolean;
  min: number;
  max: number;
  /** The column counts it may choose from, fewest first. */
  columns: number[];
  deps: unknown[];
}) {
  const ref = useRef<T>(null);
  const [fit, setFit] = useState({ size: max, columns: columns[0] ?? 1 });
  /** The box we last measured against, so our own changes cannot restart us. */
  const measured = useRef({ width: 0, height: 0 });
  const options = columns.join(",");

  const measure = useCallback(() => {
    const el = ref.current;
    if (!el || !enabled) return;

    const previous = { size: el.style.fontSize, columns: el.style.columnCount };
    // Overflow shows up as height when the text simply runs on, and as width
    // when the columns fragment sideways. Either one means it does not fit.
    const fits = (px: number) => {
      el.style.fontSize = `${px}px`;
      return el.scrollHeight <= el.clientHeight + 1 && el.scrollWidth <= el.clientWidth + 1;
    };

    let winner = { size: min, columns: Number(options.split(",")[0]) || 1 };
    for (const count of options.split(",").map(Number)) {
      el.style.columnCount = String(count);
      let low = min;
      let high = max;
      let best = 0;
      while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        if (fits(mid)) {
          best = mid;
          low = mid + 1;
        } else {
          high = mid - 1;
        }
      }
      if (best > winner.size || (best === winner.size && best > 0 && count < winner.columns)) {
        winner = { size: best, columns: count };
      }
    }

    el.style.fontSize = previous.size;
    el.style.columnCount = previous.columns;
    measured.current = { width: el.clientWidth, height: el.clientHeight };
    setFit(winner);
  }, [enabled, min, max, options]);

  useLayoutEffect(() => {
    measure();
    // deps are the content and layout inputs that change what will fit
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [measure, ...deps]);

  /*
   * Rotating the iPad, or opening the chart, changes the box it has to fit in.
   *
   * This depends on the same content the fit does, not because it needs to
   * re-run when the words change, but because the element does not exist on
   * the first render: the library is read from storage, so the page has
   * nothing to show yet and the ref is still empty. Watching the content means
   * the observer attaches as soon as there is something to attach it to.
   */
  useEffect(() => {
    if (!enabled) return;
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    let frame = 0;
    const observer = new ResizeObserver((entries) => {
      const box = entries[0]?.contentRect;
      // Re-fit only when the box we have to fill actually changed. Resizing the
      // type changes the content, and reacting to that would be a loop.
      if (
        box &&
        Math.abs(box.width - measured.current.width) < 2 &&
        Math.abs(box.height - measured.current.height) < 2
      ) {
        return;
      }
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    });
    observer.observe(el);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, measure, ...deps]);

  return { ref, size: fit.size, columns: fit.columns };
}
