"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

/**
 * Sizes text to fill its box exactly, so a song can be read without scrolling.
 *
 * On a stand, scrolling costs you a hand. The whole point is that the song is
 * simply there, and the only way to guarantee that is to let the type find its
 * own size rather than asking you to hunt for one with a pair of buttons.
 *
 * Binary search over the size range, measuring the real element rather than a
 * copy, because the answer depends on how the text actually wraps and, with two
 * columns, on how it balances. That is about six passes, in a layout effect, so
 * it settles before the browser paints and never flickers.
 *
 * A long song cannot be made to fit by shrinking it: past about forty lines the
 * type is too small to read from a metre away, which is the only distance that
 * matters here. So `min` is a readability floor rather than a last resort, and
 * anything that will not fit at that size becomes pages you turn instead, which
 * is what the paper on a music stand was always doing.
 */
export function useFitText<T extends HTMLElement>({
  enabled,
  min,
  max,
  deps,
}: {
  enabled: boolean;
  min: number;
  max: number;
  deps: unknown[];
}) {
  const ref = useRef<T>(null);
  const [size, setSize] = useState(max);
  const [pages, setPages] = useState(1);

  const measure = useCallback(() => {
    const el = ref.current;
    if (!el || !enabled) return;

    const previous = el.style.fontSize;
    // Overflow shows up as height when the text simply runs on, and as width
    // when the columns fragment sideways. Either one means it does not fit.
    const fits = (px: number) => {
      el.style.fontSize = `${px}px`;
      return el.scrollHeight <= el.clientHeight + 1 && el.scrollWidth <= el.clientWidth + 1;
    };

    let low = min;
    let high = max;
    let best = min;
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      if (fits(mid)) {
        best = mid;
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }

    // At the floor the columns fragment sideways, and each screenful of them is
    // a page. The browser has already done the splitting; we only count it.
    el.style.fontSize = `${best}px`;
    const width = el.clientWidth;
    // A trailing column gap inflates scrollWidth by a fraction of a page, so a
    // little tolerance stops it inventing an extra, nearly empty one.
    const counted = width > 0 ? Math.max(1, Math.ceil(el.scrollWidth / width - 0.15)) : 1;

    el.style.fontSize = previous;
    setSize(best);
    setPages(counted);
  }, [enabled, min, max]);

  useLayoutEffect(() => {
    measure();
    // deps are the content and layout inputs that change what will fit
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [measure, ...deps]);

  // Rotating the iPad, or opening the chart, changes the box it has to fit in.
  useEffect(() => {
    if (!enabled) return;
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    let frame = 0;
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    });
    observer.observe(el);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [enabled, measure]);

  return { ref, size, pages };
}
