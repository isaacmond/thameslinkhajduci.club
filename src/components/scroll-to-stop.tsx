"use client";
import { useEffect, useRef } from "react";

/** Drop inside a .scroll-x container: on mount it scrolls that container sideways so content x-coordinate `x` sits mid-viewport. Only scrollLeft is touched (no scrollIntoView), so the page never jumps vertically; the scroll event it fires keeps the ScrollHints edge fade honest. */
export function ScrollToStop({ x }: { x: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current?.closest<HTMLElement>(".scroll-x");
    if (el) el.scrollLeft = Math.max(0, x - el.clientWidth / 2);
  }, [x]);
  return <span ref={ref} hidden />;
}
